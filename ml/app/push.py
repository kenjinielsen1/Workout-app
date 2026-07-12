"""Server-side Web Push scheduler for rest-complete notifications (BUGFIXES.md).

A PWA can't fire a notification while the phone is locked; only a *server* push
through APNs/FCM can. When a rest starts, the client POSTs its push subscription +
how long the rest is. We hold an in-process async task that sleeps until the rest
ends, then sends the push. Requires an always-on machine (fly.toml
min_machines_running = 1) so the task survives to fire.

At most one pending push per subscription endpoint: scheduling a new rest cancels
the previous one, so back-to-back sets don't stack stale alerts. /rest/cancel
clears it when a rest is dismissed.
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

router = APIRouter()

# Longest rest we'll ever schedule — guards against a bad client value pinning a
# task forever. Real rests are 60–180s.
MAX_DELAY_SECONDS = 900

VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")


def _vapid_private_key() -> str | None:
    """pywebpush wants a PEM file path or raw key. We accept the PEM via the
    VAPID_PRIVATE_KEY secret (multiline) and materialize it to a temp file once."""
    pem = os.environ.get("VAPID_PRIVATE_KEY")
    if not pem:
        return None
    if pem.strip().startswith("-----BEGIN"):
        path = os.path.join(tempfile.gettempdir(), "vapid_private.pem")
        if not os.path.exists(path):
            with open(path, "w") as f:
                f.write(pem)
        return path
    return pem  # already a raw base64url key


# Pending sends, keyed by subscription endpoint URL.
_pending: dict[str, asyncio.Task] = {}


class RestPush(BaseModel):
    subscription: dict[str, Any]
    delay_seconds: int = Field(ge=0, le=MAX_DELAY_SECONDS)
    exercise_name: str | None = None


class RestCancel(BaseModel):
    subscription: dict[str, Any]


def _send_now(subscription: dict[str, Any], title: str, body: str) -> None:
    """Blocking web-push send (run in a threadpool). Best-effort: a gone
    subscription (404/410) or a config gap is swallowed."""
    key = _vapid_private_key()
    if not key:
        return
    from pywebpush import WebPushException, webpush  # imported lazily

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": title, "body": body, "tag": "rest-timer"}),
            vapid_private_key=key,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
    except WebPushException:
        pass  # expired/invalid subscription — nothing to do


async def _fire_after(delay: int, subscription: dict[str, Any], exercise_name: str | None, endpoint: str) -> None:
    try:
        await asyncio.sleep(delay)
        title = "Rest complete"
        body = f"Time for your next set of {exercise_name}." if exercise_name else "Time for your next set."
        await run_in_threadpool(_send_now, subscription, title, body)
    except asyncio.CancelledError:
        raise
    finally:
        _pending.pop(endpoint, None)


@router.post("/rest/push")
async def schedule_rest_push(req: RestPush) -> dict:
    endpoint = str(req.subscription.get("endpoint", ""))
    if not endpoint:
        return {"scheduled": False, "reason": "no endpoint"}
    # Replace any pending push for this device.
    existing = _pending.pop(endpoint, None)
    if existing:
        existing.cancel()
    task = asyncio.create_task(_fire_after(req.delay_seconds, req.subscription, req.exercise_name, endpoint))
    _pending[endpoint] = task
    return {"scheduled": True, "delay_seconds": req.delay_seconds, "configured": _vapid_private_key() is not None}


@router.post("/rest/cancel")
async def cancel_rest_push(req: RestCancel) -> dict:
    endpoint = str(req.subscription.get("endpoint", ""))
    task = _pending.pop(endpoint, None)
    if task:
        task.cancel()
    return {"cancelled": bool(task)}

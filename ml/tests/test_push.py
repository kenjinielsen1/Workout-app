"""Rest-push scheduler tests. The actual web-push send is mocked — we assert the
scheduling contract: fires after the delay, dedupes per subscription, cancels.

Uses asyncio.run (no pytest-asyncio dep) — each test drives one event loop so a
scheduled task can run to completion within it."""
import asyncio

import pytest

from app import push as push_mod


def _sub(endpoint="https://push.example/abc"):
    return {"endpoint": endpoint, "keys": {"p256dh": "x", "auth": "y"}}


def setup_function(_):
    push_mod._pending.clear()


def test_schedule_fires_after_delay(monkeypatch):
    sent = []
    monkeypatch.setattr(push_mod, "_send_now", lambda sub, title, body: sent.append((title, body)))

    async def run():
        res = await push_mod.schedule_rest_push(
            push_mod.RestPush(subscription=_sub(), delay_seconds=0, exercise_name="Squat")
        )
        assert res["scheduled"] is True
        await asyncio.sleep(0.05)  # let the 0s task fire
        return res

    asyncio.run(run())
    assert len(sent) == 1
    assert sent[0][0] == "Rest complete"
    assert "Squat" in sent[0][1]
    assert push_mod._pending == {}  # task cleaned itself up


def test_new_schedule_replaces_prior_for_same_device(monkeypatch):
    sent = []
    monkeypatch.setattr(push_mod, "_send_now", lambda sub, title, body: sent.append(title))

    async def run():
        await push_mod.schedule_rest_push(
            push_mod.RestPush(subscription=_sub(), delay_seconds=900, exercise_name="A")
        )
        first = push_mod._pending[_sub()["endpoint"]]
        await push_mod.schedule_rest_push(
            push_mod.RestPush(subscription=_sub(), delay_seconds=0, exercise_name="B")
        )
        await asyncio.sleep(0.05)
        return first

    first = asyncio.run(run())
    assert first.cancelled()
    assert sent == ["Rest complete"]  # only the second (0s) one fired


def test_cancel_stops_a_pending_push(monkeypatch):
    sent = []
    monkeypatch.setattr(push_mod, "_send_now", lambda sub, title, body: sent.append(title))

    async def run():
        await push_mod.schedule_rest_push(push_mod.RestPush(subscription=_sub(), delay_seconds=900))
        res = await push_mod.cancel_rest_push(push_mod.RestCancel(subscription=_sub()))
        await asyncio.sleep(0.05)
        return res

    res = asyncio.run(run())
    assert res["cancelled"] is True
    assert sent == []
    assert push_mod._pending == {}


def test_rejects_out_of_range_delay():
    with pytest.raises(Exception):
        push_mod.RestPush(subscription=_sub(), delay_seconds=99999)

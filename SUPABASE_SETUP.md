# Supabase setup runbook

Everything code-side is ready: three migrations (schema + RLS + trigger, the
143-exercise seed, and the feedback-loop columns) plus the client adapters. What's
left needs **your** Supabase account — it can't be done from this repo alone. The
steps below are the whole path from nothing to a working backend.

## 0. Prerequisites

The CLI is already installed as a dev dependency — run it with `npx supabase`
(no Homebrew needed):

```bash
npx supabase --version
```

## 1. Create the project

Create a project at <https://supabase.com/dashboard> (or `supabase projects create`).
Note its **project ref** (the `abcd…` in the dashboard URL) and, from
Settings → API, the **Project URL** and **anon public key**.

## 2. Link and push the schema

From the repo root:

```bash
npx supabase login                                  # opens the browser to authorize
npx supabase link --project-ref isnhcaytdmqahgcfneqr  # prompts for the DB password

npm run db:check        # sanity: migrations parse as valid PostgreSQL
npx supabase db push    # applies the three migrations in order
```

`db push` runs, in order:

1. `…000001_init.sql` — enums, tables (no `bar_weight_lb`), constraints, the
   depth-1 variant trigger, trigram indexes, and RLS policies.
2. `…000002_seed_exercises.sql` — 143 system exercises + aliases (idempotent upsert
   on `slug`; safe to re-run after `npm run seed:sql`).
3. `…000003_feedback.sql` — `ml_alpha_cap`, RIR-calibration columns, recommendation
   prediction columns, and the `model_eval` table.

## 3. Point the app at it

```bash
cp .env.example .env.local
# fill in:
#   VITE_SUPABASE_URL=https://<ref>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon public key>
#   VITE_ML_URL=            # optional; leave blank to run rules-only
npm run dev
```

Sign up in the app → it now runs in **Supabase mode**: local-first IndexedDB is
still the system of record, and the background queue reconciles to Postgres
(`flush()` on reconnect), with `hydrate()` pulling your data onto a new device.

## 4. (Optional) the ML service

```bash
cd ml && python train.py --n 4000          # a starter model
uvicorn app.main:app --port 8000
# then set VITE_ML_URL=http://localhost:8000 in .env.local
```

## What this repo already verified vs. what only a live project can

- **Verified here:** all three migrations parse against the real PostgreSQL grammar
  (`npm run db:check`); every client adapter's tables/columns were audited against
  the schema (this is how the missing `rir_calibration_offset` column was caught
  and added).
- **Only a live project can verify:** RLS actually scoping rows to `auth.uid()`,
  foreign-key integrity, the variant-depth trigger firing, and the read/write/sync
  round-trips. Run a real session after `db push` to confirm those end to end.

## Local integration testing (needs Docker)

If you have Docker, `supabase start` runs the full stack locally (Postgres + Auth +
PostgREST) and `supabase db reset` applies the migrations to it — the way to run
true integration tests without touching the hosted project. Not possible in the
environment this repo was built in (no Docker), which is why the above is a runbook
rather than an executed step.

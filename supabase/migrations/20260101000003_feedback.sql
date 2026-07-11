-- Feedback loop (SPEC step 10): log each recommendation's predictions + outcome,
-- and let the nightly job gate ML per user.

-- Per-user ML blend cap. 1 = ML allowed (subject to cold start), 0 = rules only.
alter table user_profile
  add column ml_alpha_cap numeric not null default 1
  check (ml_alpha_cap between 0 and 1);

-- RIR calibration (PROGRESSION.md Part 1 & 6): the learned per-user bias the
-- correctedRIR() function subtracts, plus its provenance. The app reads the offset;
-- the weekly failure-test protocol updates it (EWMA) and bumps updated/n.
alter table user_profile
  add column rir_calibration_offset  numeric      not null default 0,
  add column rir_calibration_updated timestamptz,
  add column rir_calibration_n       int          not null default 0;

-- Log what each recommendation predicted, so the nightly MAE comparison is pure
-- arithmetic over history (no re-running either engine).
alter table recommendations
  add column alpha          numeric,
  add column rule_pred_e1rm numeric,
  add column ml_pred_e1rm   numeric;

-- Nightly evaluation log: rule vs ML MAE on the held-out last 3 sessions.
create table model_eval (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  evaluated_at  timestamptz not null default now(),
  rule_mae      numeric,
  ml_mae        numeric,
  ml_alpha_cap  numeric not null,
  n             int not null,
  verdict       text not null
);

create index model_eval_user_idx on model_eval (user_id, evaluated_at desc);

alter table model_eval enable row level security;

-- Users may read their own eval history; the nightly job writes with the service
-- role (which bypasses RLS), so no owner-insert policy is needed.
create policy model_eval_read on model_eval for select
  using (user_id = auth.uid());

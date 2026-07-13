-- FEATURES.md #2 — session-start readiness check-in.
-- Three optional 1–5 taps captured at session start, plus the computed daily
-- readiness modifier they fold into. All nullable: a skipped check-in leaves the
-- progression engine at its default (S6 = 0), unchanged.

alter table workouts
  add column if not exists sleep_quality  int,
  add column if not exists soreness       int,   -- 5 = very sore
  add column if not exists energy         int,
  add column if not exists readiness_score numeric;

alter table workouts
  add constraint sleep_quality_range check (sleep_quality is null or sleep_quality between 1 and 5),
  add constraint soreness_range     check (soreness is null or soreness between 1 and 5),
  add constraint energy_range       check (energy is null or energy between 1 and 5),
  add constraint readiness_range    check (readiness_score is null or readiness_score between -1 and 1);

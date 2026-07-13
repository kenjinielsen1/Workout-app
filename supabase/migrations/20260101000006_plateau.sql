-- FEATURES.md #5 — plateau breaker. Record which resolution the user picked when
-- a genuine stall is surfaced, so the engine and the ML layer can learn which
-- resolution works for this lifter. Null until (and unless) a stall is resolved.

alter table recommendations
  add column if not exists plateau_choice text;

alter table recommendations
  add constraint plateau_choice_valid
  check (plateau_choice is null or plateau_choice in ('deload', 'rep_range_shift', 'variation'));

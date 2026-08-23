-- Per-exercise SET SCHEME (reverse pyramid etc). The app assumed straight sets
-- everywhere and silently fought anyone running a different layout — a reverse
-- pyramid got "back off one increment" for doing exactly what was intended.
--
-- Deliberately a jsonb map on user_profile rather than its own table: it rides the
-- existing profile sync path, so it needs no new sync op, no RLS policy and no
-- foreign key. Same shape as volume_calibration. Keyed by exercise_id.
--
-- A scheme decides the SHAPE of the sets, never how heavy the top set is — that
-- still comes from the engine, from real logged history.

alter table user_profile
  add column if not exists set_schemes jsonb not null default '{}'::jsonb;

-- Audit fix #2 — per-user volume-landmark calibration. MEV/MAV/MRV start as the
-- evidence-config population priors; this stores a per-muscle delta (in sets) that
-- shifts the whole band toward the user's revealed tolerance. A JSON map keyed by
-- muscle keeps it to one column that rides the existing profile sync.

alter table user_profile
  add column if not exists volume_calibration jsonb not null default '{}'::jsonb;

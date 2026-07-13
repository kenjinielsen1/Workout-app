-- FEATURES.md #1 — opt-in warm-up prescription.
-- Off by default: experienced lifters have their own ramp and find prescribed
-- warm-ups noise. When on, the app shows a ramp up to the working weight.

alter table user_profile
  add column if not exists warmup_enabled boolean not null default false;

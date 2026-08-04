-- MULTI_GYM.md — gym context, so training away from home can't corrupt calibration
-- or blend incompatible machine scales into one e1RM history.
--
-- Two rules:
--   1. Equipment settings (increments, stack minimums, micro plates, dumbbell step,
--      plate system) belong to a GYM, not a user.
--   2. MACHINE history is per-gym. Barbell/dumbbell history is NOT — 225 lb is
--      225 lb anywhere, and splitting it would fragment the best data we have.
--
-- This migration is LOSSLESS and additive. The legacy `user_exercise_overrides`
-- table and the equipment columns on `user_profile` are deliberately NOT dropped:
-- they are copied onto the home gym and left in place as a fallback, so an older
-- client keeps working and nothing is destroyed. A later migration can retire them
-- once every client reads from gyms.

create table if not exists gyms (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null,
  is_home             boolean not null default false,
  -- Per-gym equipment profile (moved off user_profile).
  has_micro_plates      boolean not null default true,
  dumbbell_increment_lb numeric not null default 5,
  plate_system          text not null default 'imperial'
                          check (plate_system in ('imperial', 'metric')),
  created_at          timestamptz not null default now()
);

create index if not exists gyms_user_idx on gyms (user_id);

-- Exactly one home gym per user.
create unique index if not exists gyms_one_home_per_user
  on gyms (user_id) where is_home;

-- Replaces user_exercise_overrides, keyed by gym instead of user (INCREMENTS.md).
create table if not exists gym_exercise_overrides (
  gym_id              uuid not null references gyms (id) on delete cascade,
  exercise_id         uuid not null references exercises (id) on delete cascade,
  weight_increment_lb numeric,
  weight_stack_min_lb numeric,
  updated_at          timestamptz not null default now(),
  primary key (gym_id, exercise_id),
  constraint gym_override_increment_positive check (weight_increment_lb is null or weight_increment_lb > 0),
  constraint gym_override_min_nonneg        check (weight_stack_min_lb is null or weight_stack_min_lb >= 0)
);

-- Gym context on every session. Null = legacy / home.
alter table workouts add column if not exists gym_id uuid references gyms (id) on delete set null;

alter table gyms enable row level security;
alter table gym_exercise_overrides enable row level security;

do $$ begin
  create policy gyms_owner on gyms for all
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- The override table has no user_id; ownership is inherited from its gym.
do $$ begin
  create policy gym_overrides_owner on gym_exercise_overrides for all
    using (exists (select 1 from gyms g where g.id = gym_id and g.user_id = auth.uid()))
    with check (exists (select 1 from gyms g where g.id = gym_id and g.user_id = auth.uid()));
exception when duplicate_object then null;
end $$;

-- ── Backfill ────────────────────────────────────────────────────────────────
-- One home gym per existing user, carrying their current equipment settings, so
-- someone who never adds a second gym sees no change whatsoever.
insert into gyms (id, user_id, name, is_home, has_micro_plates, dumbbell_increment_lb, plate_system)
select
  gen_random_uuid(), p.user_id, 'Home gym', true,
  coalesce(p.has_micro_plates, true),
  coalesce(p.dumbbell_increment_lb, 5),
  coalesce(p.plate_system, 'imperial')
from user_profile p
where not exists (select 1 from gyms g where g.user_id = p.user_id and g.is_home);

-- Move existing per-user machine calibration onto that home gym.
insert into gym_exercise_overrides (gym_id, exercise_id, weight_increment_lb, weight_stack_min_lb)
select g.id, o.exercise_id, o.weight_increment_lb, o.weight_stack_min_lb
from user_exercise_overrides o
join gyms g on g.user_id = o.user_id and g.is_home
on conflict (gym_id, exercise_id) do nothing;

-- Existing sessions happened at the home gym.
update workouts w
set gym_id = g.id
from gyms g
where g.user_id = w.user_id and g.is_home and w.gym_id is null;

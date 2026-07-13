-- INCREMENTS.md — per-exercise weight increments for cables & machines.
-- "Nearest 5 lb" is wrong for real equipment: stacks step by their own amount and
-- start at their own minimum. Increment is a property of the machine, so it lives
-- on the exercise, with a per-user override for gym-to-gym variation.

alter table exercises
  add column if not exists weight_increment_lb numeric,   -- machine's actual step; null for free weights
  add column if not exists weight_stack_min_lb numeric;    -- lightest selectable weight; null = 0

-- Seed the typical step for selectorized/cable from the existing catalog hint.
-- Plate-loaded and free weights stay null → 2.5 grid. Users refine via overrides.
update exercises
  set weight_increment_lb = default_increment_lb
  where equipment in ('machine_selectorized', 'cable')
    and weight_increment_lb is null;

-- Per-user, per-exercise override — the same machine differs between gyms.
create table if not exists user_exercise_overrides (
  user_id             uuid not null references auth.users (id) on delete cascade,
  exercise_id         uuid not null references exercises (id) on delete cascade,
  weight_increment_lb numeric,
  weight_stack_min_lb numeric,
  updated_at          timestamptz not null default now(),
  primary key (user_id, exercise_id),
  constraint override_increment_positive check (weight_increment_lb is null or weight_increment_lb > 0),
  constraint override_min_nonneg        check (weight_stack_min_lb is null or weight_stack_min_lb >= 0)
);

alter table user_exercise_overrides enable row level security;

create policy override_owner on user_exercise_overrides for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

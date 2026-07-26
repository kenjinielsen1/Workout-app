-- SAVED_WORKOUTS.md — named, reusable exercise lists ("Push A", "Legs").
--
-- ARCHITECTURAL RULE: a template stores WHICH exercises and IN WHAT ORDER, and
-- nothing else. No weight, rep, or set columns exist here on purpose — those come
-- from the recommendation engine, computed fresh each session from that exercise's
-- own history and the user's readiness. Storing them would create a second source
-- of truth competing with the engine, and the two would diverge immediately.
--
--   template → what am I doing today?
--   engine   → how heavy, how many.
--
-- If a future feature seems to want a weight/rep/set column here, that's a signal
-- it belongs in the engine instead.

create table if not exists workout_templates (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_templates_user_idx on workout_templates (user_id);

create table if not exists workout_template_exercises (
  template_id uuid not null references workout_templates (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete cascade,
  position    int  not null,
  primary key (template_id, position)
);

alter table workout_templates enable row level security;
alter table workout_template_exercises enable row level security;

-- Owner-only, consistent with every other user table.
do $$ begin
  create policy workout_templates_owner on workout_templates for all
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- The join table has no user_id of its own; ownership is inherited from its parent.
do $$ begin
  create policy workout_template_exercises_owner on workout_template_exercises for all
    using (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()))
    with check (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()));
exception when duplicate_object then null;
end $$;

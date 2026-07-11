-- Progressive Overload — initial schema, RLS, and indexes.
--
-- Invariants baked into this schema:
--   1. All weights are pounds. There is no metric column anywhere.
--   2. All barbells are 45 lb. There is deliberately NO bar_weight_lb column —
--      equipment = 'barbell' implies a 45 lb bar.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- trigram index on aliases / fuzzy match

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type movement_pattern as enum (
  'squat', 'hinge', 'horizontal_push', 'vertical_push',
  'horizontal_pull', 'vertical_pull', 'lunge', 'carry', 'isolation'
);

create type equipment as enum (
  'barbell', 'dumbbell', 'kettlebell', 'machine_selectorized',
  'machine_plate', 'cable', 'bodyweight', 'band'
);

-- Meaning of sets.weight_lb depends on this. Getting it wrong is silent.
create type load_type as enum ('total', 'per_side', 'per_hand', 'bodyweight_plus');

create type training_goal as enum ('strength', 'hypertrophy', 'endurance');

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------
create table exercises (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,             -- 'barbell-back-squat'
  name                 text not null,
  movement_pattern     movement_pattern not null,
  primary_muscles      text[] not null default '{}',
  secondary_muscles    text[] not null default '{}',
  equipment            equipment not null,
  load_type            load_type not null,
  is_unilateral        boolean not null default false,
  is_compound          boolean not null default false,   -- drives default set/rep scheme
  default_increment_lb numeric not null,                 -- 5 upper / 10 lower / 2.5 isolation
  fatigue_cost         numeric not null default 3,       -- 1..5; weights ACWR
  is_system            boolean not null default false,   -- true = seeded by us
  owner_id             uuid references auth.users (id) on delete cascade,
  variant_of           uuid references exercises (id) on delete set null,
  created_at           timestamptz not null default now(),

  constraint fatigue_cost_range check (fatigue_cost between 1 and 5),
  constraint default_increment_positive check (default_increment_lb > 0),
  -- System exercises have no owner; user exercises must have one.
  constraint system_ownership check (
    (is_system and owner_id is null) or (not is_system and owner_id is not null)
  )
);

-- variant_of is depth-1 only: a variant may not itself be a variant (no cycles).
-- Enforced by trigger since a plain CHECK can't reference another row.
create or replace function enforce_variant_depth1()
returns trigger language plpgsql as $$
begin
  if new.variant_of is not null then
    if exists (select 1 from exercises p
               where p.id = new.variant_of and p.variant_of is not null) then
      raise exception 'variant_of must point at a root exercise (depth 1 only)';
    end if;
    if new.variant_of = new.id then
      raise exception 'an exercise cannot be a variant of itself';
    end if;
  end if;
  -- Also block making a row a root-with-children into a variant.
  if new.variant_of is not null
     and exists (select 1 from exercises c where c.variant_of = new.id) then
    raise exception 'exercise already has variants; it cannot become a variant';
  end if;
  return new;
end;
$$;

create trigger trg_variant_depth1
  before insert or update on exercises
  for each row execute function enforce_variant_depth1();

create index exercises_owner_idx on exercises (owner_id);
create index exercises_pattern_idx on exercises (movement_pattern);
create index exercises_equipment_idx on exercises (equipment);
create index exercises_variant_idx on exercises (variant_of);
-- Fuzzy-match on create ("Did you mean Barbell Back Squat?").
create index exercises_name_trgm on exercises using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- exercise_aliases  — what stops "squat" -> nothing -> duplicate -> fragmented history
-- ---------------------------------------------------------------------------
create table exercise_aliases (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises (id) on delete cascade,
  alias       text not null,
  unique (exercise_id, alias)
);

create index aliases_trgm on exercise_aliases using gin (alias gin_trgm_ops);
create index aliases_exercise_idx on exercise_aliases (exercise_id);

-- ---------------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------------
create table workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  performed_at timestamptz not null default now(),
  notes        text,
  session_rpe  numeric,                                  -- 1..10 overall difficulty
  created_at   timestamptz not null default now(),
  constraint session_rpe_range check (session_rpe is null or session_rpe between 1 and 10)
);

create index workouts_user_time_idx on workouts (user_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- sets
-- ---------------------------------------------------------------------------
create table sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete restrict,
  set_number  int not null,
  weight_lb   numeric not null,                          -- meaning depends on load_type
  reps        int not null,
  rir         int,                                       -- reps in reserve, 0..5
  is_warmup   boolean not null default false,            -- excluded from all ML features
  failed      boolean not null default false,
  tempo       text,                                      -- nullable, e.g. '3-1-1-0'
  created_at  timestamptz not null default now(),

  constraint weight_nonneg check (weight_lb >= 0),
  constraint reps_positive check (reps >= 0),
  constraint rir_range check (rir is null or rir between 0 and 5),
  unique (workout_id, exercise_id, set_number)
);

create index sets_workout_idx on sets (workout_id);
create index sets_exercise_idx on sets (exercise_id);

-- ---------------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------------
create table recommendations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  exercise_id      uuid not null references exercises (id) on delete cascade,
  generated_at     timestamptz not null default now(),
  target_weight_lb numeric not null,                     -- always a multiple of 2.5
  target_reps      int not null,
  target_sets      int not null,
  confidence       numeric not null,                     -- 0..1
  rationale        text not null,
  accepted         boolean,
  actual_outcome   jsonb,

  constraint confidence_range check (confidence between 0 and 1),
  -- Loadability floor enforced at write time; barbell floor handled in app layer.
  constraint target_on_grid check (mod((target_weight_lb * 10)::numeric, 25) = 0)
);

create index recommendations_user_ex_idx on recommendations (user_id, exercise_id, generated_at desc);

-- ---------------------------------------------------------------------------
-- user_profile  (one row per auth user)
-- ---------------------------------------------------------------------------
create table user_profile (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  bodyweight_lb         numeric,
  training_age_months   int,
  goal                  training_goal not null default 'strength',
  sessions_per_week     int,
  has_micro_plates      boolean not null default false,
  dumbbell_increment_lb numeric not null default 5,
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table exercises        enable row level security;
alter table exercise_aliases enable row level security;
alter table workouts         enable row level security;
alter table sets             enable row level security;
alter table recommendations  enable row level security;
alter table user_profile     enable row level security;

-- exercises: read system + your own; write only your own non-system rows.
create policy exercise_read on exercises for select
  using (is_system = true or owner_id = auth.uid());

create policy exercise_write on exercises for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and is_system = false);

-- aliases: readable when the parent exercise is; writable only for your own exercises.
create policy alias_read on exercise_aliases for select
  using (exists (
    select 1 from exercises e
    where e.id = exercise_aliases.exercise_id
      and (e.is_system = true or e.owner_id = auth.uid())
  ));

create policy alias_write on exercise_aliases for all
  using (exists (
    select 1 from exercises e
    where e.id = exercise_aliases.exercise_id and e.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from exercises e
    where e.id = exercise_aliases.exercise_id
      and e.owner_id = auth.uid() and e.is_system = false
  ));

-- Standard owner-only policies on the rest.
create policy workout_owner on workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy set_owner on sets for all
  using (exists (select 1 from workouts w where w.id = sets.workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = sets.workout_id and w.user_id = auth.uid()));

create policy recommendation_owner on recommendations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy profile_owner on user_profile for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

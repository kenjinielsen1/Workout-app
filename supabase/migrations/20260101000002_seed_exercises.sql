-- GENERATED FILE — do not edit by hand.
-- Source: seeds/exercises.json  •  Regenerate: npm run seed:sql
-- Idempotent: upserts on the natural key `slug`.

begin;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-back-squat', 'Barbell Back Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors', 'erectors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 5, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-front-squat', 'Barbell Front Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['erectors', 'abs']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'safety-bar-squat', 'Safety Bar Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['erectors', 'upper_back']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pause-back-squat', 'Pause Back Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors', 'erectors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'tempo-back-squat', 'Tempo Back Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors', 'erectors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'box-squat', 'Box Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['hamstrings', 'erectors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'goblet-squat', 'Goblet Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['abs', 'adductors']::text[], 'dumbbell'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'hack-squat-machine', 'Hack Squat (Machine)', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors']::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'leg-press', 'Leg Press', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['hamstrings', 'adductors']::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'smith-machine-squat', 'Smith Machine Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-squat', 'Dumbbell Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'zercher-squat', 'Zercher Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['erectors', 'biceps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'belt-squat-machine', 'Belt Squat (Machine)', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors']::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-deadlift', 'Barbell Deadlift', 'hinge'::movement_pattern, ARRAY['glutes', 'hamstrings', 'erectors']::text[], ARRAY['lats', 'traps', 'forearms']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 5, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'sumo-deadlift', 'Sumo Deadlift', 'hinge'::movement_pattern, ARRAY['glutes', 'quadriceps', 'adductors']::text[], ARRAY['erectors', 'traps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 5, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'romanian-deadlift', 'Romanian Deadlift', 'hinge'::movement_pattern, ARRAY['hamstrings', 'glutes']::text[], ARRAY['erectors', 'forearms']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'stiff-leg-deadlift', 'Stiff-Leg Deadlift', 'hinge'::movement_pattern, ARRAY['hamstrings', 'glutes']::text[], ARRAY['erectors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'deficit-deadlift', 'Deficit Deadlift', 'hinge'::movement_pattern, ARRAY['glutes', 'hamstrings', 'erectors']::text[], ARRAY['quadriceps', 'traps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 5, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'rack-pull', 'Rack Pull', 'hinge'::movement_pattern, ARRAY['erectors', 'glutes', 'traps']::text[], ARRAY['hamstrings', 'forearms']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pause-deadlift', 'Pause Deadlift', 'hinge'::movement_pattern, ARRAY['glutes', 'hamstrings', 'erectors']::text[], ARRAY['lats', 'traps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 5, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-good-morning', 'Barbell Good Morning', 'hinge'::movement_pattern, ARRAY['hamstrings', 'glutes', 'erectors']::text[], ARRAY['adductors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-hip-thrust', 'Barbell Hip Thrust', 'hinge'::movement_pattern, ARRAY['glutes']::text[], ARRAY['hamstrings', 'quadriceps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'glute-bridge', 'Glute Bridge', 'hinge'::movement_pattern, ARRAY['glutes']::text[], ARRAY['hamstrings']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift', 'hinge'::movement_pattern, ARRAY['hamstrings', 'glutes']::text[], ARRAY['erectors', 'forearms']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'single-leg-romanian-deadlift', 'Single-Leg Romanian Deadlift', 'hinge'::movement_pattern, ARRAY['hamstrings', 'glutes']::text[], ARRAY['erectors', 'abs']::text[], 'dumbbell'::equipment, 'total'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'kettlebell-swing', 'Kettlebell Swing', 'hinge'::movement_pattern, ARRAY['glutes', 'hamstrings']::text[], ARRAY['erectors', 'side_delts']::text[], 'kettlebell'::equipment, 'total'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'back-extension', 'Back Extension', 'hinge'::movement_pattern, ARRAY['erectors', 'glutes']::text[], ARRAY['hamstrings']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-pull-through', 'Cable Pull-Through', 'hinge'::movement_pattern, ARRAY['glutes', 'hamstrings']::text[], ARRAY['erectors']::text[], 'cable'::equipment, 'total'::load_type, false, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-glute-kickback', 'Machine Glute Kickback', 'hinge'::movement_pattern, ARRAY['glutes']::text[], ARRAY['hamstrings']::text[], 'machine_selectorized'::equipment, 'total'::load_type, true, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-bench-press', 'Barbell Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-incline-bench-press', 'Barbell Incline Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'front_delts']::text[], ARRAY['triceps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'close-grip-bench-press', 'Close-Grip Bench Press', 'horizontal_push'::movement_pattern, ARRAY['triceps', 'pectorals']::text[], ARRAY['front_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pause-bench-press', 'Pause Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'tempo-bench-press', 'Tempo Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-bench-press', 'Dumbbell Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-incline-press', 'Dumbbell Incline Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'front_delts']::text[], ARRAY['triceps']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-chest-press', 'Machine Chest Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-chest-press', 'Cable Chest Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'cable'::equipment, 'total'::load_type, false, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'decline-bench-press', 'Decline Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'smith-machine-bench-press', 'Smith Machine Bench Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'push-up', 'Push-Up', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts', 'abs']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'chest-dip', 'Chest Dip', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-floor-press', 'Dumbbell Floor Press', 'horizontal_push'::movement_pattern, ARRAY['pectorals', 'triceps']::text[], ARRAY['front_delts']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-overhead-press', 'Barbell Overhead Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps', 'traps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'push-press', 'Push Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps', 'quadriceps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'seated-barbell-shoulder-press', 'Seated Barbell Shoulder Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'arnold-press', 'Arnold Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-shoulder-press', 'Machine Shoulder Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'landmine-press', 'Landmine Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'pectorals']::text[], ARRAY['triceps', 'abs']::text[], 'barbell'::equipment, 'total'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'z-press', 'Z-Press', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'side_delts']::text[], ARRAY['triceps', 'abs']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pike-push-up', 'Pike Push-Up', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'triceps']::text[], ARRAY['side_delts']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'handstand-push-up', 'Handstand Push-Up', 'vertical_push'::movement_pattern, ARRAY['front_delts', 'triceps']::text[], ARRAY['side_delts', 'traps']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pull-up', 'Pull-Up', 'vertical_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps', 'forearms']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'chin-up', 'Chin-Up', 'vertical_pull'::movement_pattern, ARRAY['lats', 'biceps']::text[], ARRAY['upper_back', 'forearms']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'lat-pulldown', 'Lat Pulldown', 'vertical_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps']::text[], 'cable'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'neutral-grip-pulldown', 'Neutral-Grip Pulldown', 'vertical_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps', 'brachialis']::text[], 'cable'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'close-grip-pulldown', 'Close-Grip Pulldown', 'vertical_pull'::movement_pattern, ARRAY['lats', 'biceps']::text[], ARRAY['upper_back']::text[], 'cable'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'assisted-pull-up-machine', 'Assisted Pull-Up (Machine)', 'vertical_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'straight-arm-pulldown', 'Straight-Arm Pulldown', 'vertical_pull'::movement_pattern, ARRAY['lats']::text[], ARRAY['triceps', 'abs']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'kneeling-cable-pulldown', 'Kneeling Cable Pulldown', 'vertical_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps']::text[], 'cable'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-bent-over-row', 'Barbell Bent-Over Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'erectors', 'rear_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pendlay-row', 'Pendlay Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'erectors']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'horizontal_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps', 'rear_delts']::text[], 'dumbbell'::equipment, 'total'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  't-bar-row', 'T-Bar Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'seated-cable-row', 'Seated Cable Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'cable'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'chest-supported-machine-row', 'Chest-Supported Machine Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, true, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'inverted-row', 'Inverted Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'meadows-row', 'Meadows Row', 'horizontal_pull'::movement_pattern, ARRAY['lats', 'upper_back']::text[], ARRAY['biceps', 'rear_delts']::text[], 'barbell'::equipment, 'total'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-chest-supported-row', 'Dumbbell Chest-Supported Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-walking-lunge', 'Dumbbell Walking Lunge', 'lunge'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['hamstrings', 'adductors']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-lunge', 'Barbell Lunge', 'lunge'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['hamstrings', 'adductors']::text[], 'barbell'::equipment, 'total'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-reverse-lunge', 'Dumbbell Reverse Lunge', 'lunge'::movement_pattern, ARRAY['glutes', 'quadriceps']::text[], ARRAY['hamstrings']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'bulgarian-split-squat', 'Bulgarian Split Squat', 'lunge'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors', 'hamstrings']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-step-up', 'Dumbbell Step-Up', 'lunge'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['hamstrings']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'split-squat', 'Split Squat', 'lunge'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['adductors']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, true, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'lateral-lunge', 'Lateral Lunge', 'lunge'::movement_pattern, ARRAY['glutes', 'adductors']::text[], ARRAY['quadriceps']::text[], 'dumbbell'::equipment, 'total'::load_type, true, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'curtsy-lunge', 'Curtsy Lunge', 'lunge'::movement_pattern, ARRAY['glutes', 'quadriceps']::text[], ARRAY['adductors']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, true, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'farmers-carry', 'Farmer''s Carry', 'carry'::movement_pattern, ARRAY['forearms', 'traps']::text[], ARRAY['abs', 'upper_back']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'suitcase-carry', 'Suitcase Carry', 'carry'::movement_pattern, ARRAY['obliques', 'forearms']::text[], ARRAY['abs', 'traps']::text[], 'dumbbell'::equipment, 'total'::load_type, true, true, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'front-rack-carry', 'Front-Rack Carry', 'carry'::movement_pattern, ARRAY['abs', 'traps']::text[], ARRAY['front_delts', 'upper_back']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'overhead-carry', 'Overhead Carry', 'carry'::movement_pattern, ARRAY['side_delts', 'abs']::text[], ARRAY['triceps', 'traps']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'kettlebell-farmers-carry', 'Kettlebell Farmer''s Carry', 'carry'::movement_pattern, ARRAY['forearms', 'traps']::text[], ARRAY['abs']::text[], 'kettlebell'::equipment, 'per_hand'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-curl', 'Barbell Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['forearms', 'brachialis']::text[], 'barbell'::equipment, 'total'::load_type, false, false, 2.5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-curl', 'Dumbbell Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['forearms']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'hammer-curl', 'Hammer Curl', 'isolation'::movement_pattern, ARRAY['brachialis', 'biceps']::text[], ARRAY['forearms']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'preacher-curl', 'Preacher Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['brachialis']::text[], 'barbell'::equipment, 'total'::load_type, false, false, 2.5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'incline-dumbbell-curl', 'Incline Dumbbell Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['forearms']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-curl', 'Cable Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['forearms']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'concentration-curl', 'Concentration Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['brachialis']::text[], 'dumbbell'::equipment, 'total'::load_type, true, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'spider-curl', 'Spider Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['forearms']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'reverse-curl', 'Reverse Curl', 'isolation'::movement_pattern, ARRAY['brachialis', 'forearms']::text[], ARRAY['biceps']::text[], 'barbell'::equipment, 'total'::load_type, false, false, 2.5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-rope-hammer-curl', 'Cable Rope Hammer Curl', 'isolation'::movement_pattern, ARRAY['brachialis', 'biceps']::text[], ARRAY['forearms']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'tricep-pushdown', 'Tricep Pushdown', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'rope-pushdown', 'Rope Pushdown', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'overhead-cable-extension', 'Overhead Cable Extension', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-overhead-extension', 'Dumbbell Overhead Extension', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'dumbbell'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-skullcrusher', 'Dumbbell Skullcrusher', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-tricep-kickback', 'Dumbbell Tricep Kickback', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'bench-dip', 'Bench Dip', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY['front_delts']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'close-grip-push-up', 'Close-Grip Push-Up', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY['pectorals']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'isolation'::movement_pattern, ARRAY['side_delts']::text[], ARRAY['traps']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-lateral-raise', 'Cable Lateral Raise', 'isolation'::movement_pattern, ARRAY['side_delts']::text[], ARRAY[]::text[], 'cable'::equipment, 'total'::load_type, true, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-front-raise', 'Dumbbell Front Raise', 'isolation'::movement_pattern, ARRAY['front_delts']::text[], ARRAY[]::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-rear-delt-fly', 'Dumbbell Rear-Delt Fly', 'isolation'::movement_pattern, ARRAY['rear_delts']::text[], ARRAY['upper_back']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'reverse-pec-deck', 'Reverse Pec Deck', 'isolation'::movement_pattern, ARRAY['rear_delts']::text[], ARRAY['upper_back']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-face-pull', 'Cable Face Pull', 'isolation'::movement_pattern, ARRAY['rear_delts', 'upper_back']::text[], ARRAY['traps']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-upright-row', 'Barbell Upright Row', 'isolation'::movement_pattern, ARRAY['side_delts', 'traps']::text[], ARRAY['biceps']::text[], 'barbell'::equipment, 'total'::load_type, false, false, 2.5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-lateral-raise', 'Machine Lateral Raise', 'isolation'::movement_pattern, ARRAY['side_delts']::text[], ARRAY['traps']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pec-deck', 'Pec Deck', 'isolation'::movement_pattern, ARRAY['pectorals']::text[], ARRAY['front_delts']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-fly', 'Dumbbell Fly', 'isolation'::movement_pattern, ARRAY['pectorals']::text[], ARRAY['front_delts']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-fly', 'Cable Fly', 'isolation'::movement_pattern, ARRAY['pectorals']::text[], ARRAY['front_delts']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'incline-dumbbell-fly', 'Incline Dumbbell Fly', 'isolation'::movement_pattern, ARRAY['pectorals']::text[], ARRAY['front_delts']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-pullover', 'Dumbbell Pullover', 'isolation'::movement_pattern, ARRAY['pectorals', 'lats']::text[], ARRAY['triceps']::text[], 'dumbbell'::equipment, 'total'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'barbell-shrug', 'Barbell Shrug', 'isolation'::movement_pattern, ARRAY['traps']::text[], ARRAY['forearms']::text[], 'barbell'::equipment, 'total'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-shrug', 'Dumbbell Shrug', 'isolation'::movement_pattern, ARRAY['traps']::text[], ARRAY['forearms']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-shrug', 'Machine Shrug', 'isolation'::movement_pattern, ARRAY['traps']::text[], ARRAY['forearms']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'leg-extension', 'Leg Extension', 'isolation'::movement_pattern, ARRAY['quadriceps']::text[], ARRAY[]::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'seated-leg-curl', 'Seated Leg Curl', 'isolation'::movement_pattern, ARRAY['hamstrings']::text[], ARRAY['calves']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'lying-leg-curl', 'Lying Leg Curl', 'isolation'::movement_pattern, ARRAY['hamstrings']::text[], ARRAY['calves']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'standing-calf-raise', 'Standing Calf Raise', 'isolation'::movement_pattern, ARRAY['calves']::text[], ARRAY[]::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'seated-calf-raise', 'Seated Calf Raise', 'isolation'::movement_pattern, ARRAY['calves']::text[], ARRAY[]::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'leg-press-calf-raise', 'Leg Press Calf Raise', 'isolation'::movement_pattern, ARRAY['calves']::text[], ARRAY[]::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, false, 10, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'hip-abduction-machine', 'Hip Abduction (Machine)', 'isolation'::movement_pattern, ARRAY['hip_abductors', 'glutes']::text[], ARRAY[]::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'hip-adduction-machine', 'Hip Adduction (Machine)', 'isolation'::movement_pattern, ARRAY['hip_adductors', 'adductors']::text[], ARRAY[]::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 10, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'nordic-ham-curl', 'Nordic Ham Curl', 'isolation'::movement_pattern, ARRAY['hamstrings']::text[], ARRAY['glutes']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'hanging-leg-raise', 'Hanging Leg Raise', 'isolation'::movement_pattern, ARRAY['abs', 'hip_flexors']::text[], ARRAY['obliques']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-crunch', 'Cable Crunch', 'isolation'::movement_pattern, ARRAY['abs']::text[], ARRAY['obliques']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'ab-wheel-rollout', 'Ab Wheel Rollout', 'isolation'::movement_pattern, ARRAY['abs']::text[], ARRAY['obliques', 'lats']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'weighted-decline-sit-up', 'Weighted Decline Sit-Up', 'isolation'::movement_pattern, ARRAY['abs', 'hip_flexors']::text[], ARRAY['obliques']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'captains-chair-leg-raise', 'Captain''s Chair Leg Raise', 'isolation'::movement_pattern, ARRAY['abs', 'hip_flexors']::text[], ARRAY['obliques']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-wrist-curl', 'Dumbbell Wrist Curl', 'isolation'::movement_pattern, ARRAY['forearms']::text[], ARRAY[]::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-reverse-wrist-curl', 'Dumbbell Reverse Wrist Curl', 'isolation'::movement_pattern, ARRAY['forearms']::text[], ARRAY[]::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'sissy-squat', 'Sissy Squat', 'squat'::movement_pattern, ARRAY['quadriceps']::text[], ARRAY['hip_flexors']::text[], 'bodyweight'::equipment, 'bodyweight_plus'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'single-leg-press', 'Single-Leg Press', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['hamstrings']::text[], 'machine_plate'::equipment, 'per_side'::load_type, true, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-hip-thrust', 'Machine Hip Thrust', 'hinge'::movement_pattern, ARRAY['glutes']::text[], ARRAY['hamstrings']::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'landmine-row', 'Landmine Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 5, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'chest-supported-t-bar-row', 'Chest-Supported T-Bar Row', 'horizontal_pull'::movement_pattern, ARRAY['upper_back', 'lats']::text[], ARRAY['biceps', 'rear_delts']::text[], 'machine_plate'::equipment, 'per_side'::load_type, false, true, 10, 3, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'pause-front-squat', 'Pause Front Squat', 'squat'::movement_pattern, ARRAY['quadriceps', 'glutes']::text[], ARRAY['erectors', 'abs']::text[], 'barbell'::equipment, 'total'::load_type, false, true, 10, 4, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-preacher-curl', 'Machine Preacher Curl', 'isolation'::movement_pattern, ARRAY['biceps']::text[], ARRAY['brachialis']::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'machine-tricep-extension', 'Machine Tricep Extension', 'isolation'::movement_pattern, ARRAY['triceps']::text[], ARRAY[]::text[], 'machine_selectorized'::equipment, 'total'::load_type, false, false, 5, 1, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'dumbbell-upright-row', 'Dumbbell Upright Row', 'isolation'::movement_pattern, ARRAY['side_delts', 'traps']::text[], ARRAY['biceps']::text[], 'dumbbell'::equipment, 'per_hand'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

insert into exercises (slug, name, movement_pattern, primary_muscles, secondary_muscles, equipment, load_type, is_unilateral, is_compound, default_increment_lb, fatigue_cost, is_system, owner_id) values (
  'cable-upright-row', 'Cable Upright Row', 'isolation'::movement_pattern, ARRAY['side_delts', 'traps']::text[], ARRAY['biceps']::text[], 'cable'::equipment, 'total'::load_type, false, false, 5, 2, true, null)
on conflict (slug) do update set name = excluded.name, movement_pattern = excluded.movement_pattern, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, load_type = excluded.load_type, is_unilateral = excluded.is_unilateral, is_compound = excluded.is_compound, default_increment_lb = excluded.default_increment_lb, fatigue_cost = excluded.fatigue_cost;

update exercises set variant_of = (select id from exercises where slug = 'barbell-back-squat') where slug = 'safety-bar-squat';
update exercises set variant_of = (select id from exercises where slug = 'barbell-back-squat') where slug = 'pause-back-squat';
update exercises set variant_of = (select id from exercises where slug = 'barbell-back-squat') where slug = 'tempo-back-squat';
update exercises set variant_of = (select id from exercises where slug = 'barbell-back-squat') where slug = 'box-squat';
update exercises set variant_of = (select id from exercises where slug = 'barbell-deadlift') where slug = 'deficit-deadlift';
update exercises set variant_of = (select id from exercises where slug = 'barbell-deadlift') where slug = 'rack-pull';
update exercises set variant_of = (select id from exercises where slug = 'barbell-deadlift') where slug = 'pause-deadlift';
update exercises set variant_of = (select id from exercises where slug = 'barbell-bench-press') where slug = 'pause-bench-press';
update exercises set variant_of = (select id from exercises where slug = 'barbell-bench-press') where slug = 'tempo-bench-press';
update exercises set variant_of = (select id from exercises where slug = 'barbell-overhead-press') where slug = 'z-press';
update exercises set variant_of = (select id from exercises where slug = 'barbell-bent-over-row') where slug = 'pendlay-row';
update exercises set variant_of = (select id from exercises where slug = 'barbell-front-squat') where slug = 'pause-front-squat';

delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-back-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-back-squat'), 'back squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-back-squat'), 'bb squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-back-squat'), 'high bar squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-back-squat'), 'barbell squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-back-squat'), 'squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-front-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-front-squat'), 'front squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-front-squat'), 'bb front squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-front-squat'), 'barbell front squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-front-squat'), 'clean grip squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'safety-bar-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'safety-bar-squat'), 'ssb squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'safety-bar-squat'), 'safety squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'safety-bar-squat'), 'safety bar back squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'safety-bar-squat'), 'yoke bar squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pause-back-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-back-squat'), 'paused squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-back-squat'), 'pause squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-back-squat'), 'paused back squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-back-squat'), 'bottom pause squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'tempo-back-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-back-squat'), 'tempo squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-back-squat'), 'slow squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-back-squat'), 'controlled squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-back-squat'), '3-second squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'box-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'box-squat'), 'box back squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'box-squat'), 'squat to box');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'box-squat'), 'bench squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'goblet-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'goblet-squat'), 'goblet dumbbell squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'goblet-squat'), 'db goblet squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'goblet-squat'), 'kettlebell goblet squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'goblet-squat'), 'front held squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'hack-squat-machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hack-squat-machine'), 'hack squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hack-squat-machine'), 'machine hack squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hack-squat-machine'), 'plate hack squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hack-squat-machine'), 'sled hack squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'leg-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press'), 'leg press machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press'), '45 degree leg press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press'), 'plate leg press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press'), 'sled press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'smith-machine-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-squat'), 'smith squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-squat'), 'machine squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-squat'), 'guided squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-squat'), 'smith bar squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-squat'), 'db squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-squat'), 'dumbbell held squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-squat'), 'double dumbbell squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-squat'), 'two dumbbell squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'zercher-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'zercher-squat'), 'zercher');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'zercher-squat'), 'elbow squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'zercher-squat'), 'front loaded zercher');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'belt-squat-machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'belt-squat-machine'), 'belt squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'belt-squat-machine'), 'hip belt squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'belt-squat-machine'), 'pit shark squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'belt-squat-machine'), 'machine belt squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-deadlift'), 'deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-deadlift'), 'conventional deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-deadlift'), 'bb deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-deadlift'), 'barbell dead lift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-deadlift'), 'dead');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'sumo-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sumo-deadlift'), 'sumo dead');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sumo-deadlift'), 'wide stance deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sumo-deadlift'), 'sumo pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sumo-deadlift'), 'sumo dl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'romanian-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'romanian-deadlift'), 'rdl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'romanian-deadlift'), 'romanian dl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'romanian-deadlift'), 'stiff romanian deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'romanian-deadlift'), 'barbell rdl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'stiff-leg-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'stiff-leg-deadlift'), 'sldl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'stiff-leg-deadlift'), 'straight leg deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'stiff-leg-deadlift'), 'stiff legged deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'stiff-leg-deadlift'), 'straight leg dl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'deficit-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'deficit-deadlift'), 'deficit pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'deficit-deadlift'), 'elevated deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'deficit-deadlift'), 'deficit dl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'rack-pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rack-pull'), 'rack deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rack-pull'), 'pin pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rack-pull'), 'block pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rack-pull'), 'partial deadlift');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pause-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-deadlift'), 'paused deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-deadlift'), 'pause pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-deadlift'), 'paused dl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-good-morning');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-good-morning'), 'good morning');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-good-morning'), 'bb good morning');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-good-morning'), 'gm');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-good-morning'), 'barbell gm');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-hip-thrust');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-hip-thrust'), 'hip thrust');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-hip-thrust'), 'bb hip thrust');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-hip-thrust'), 'barbell thrust');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-hip-thrust'), 'glute thrust');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'glute-bridge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'glute-bridge'), 'barbell glute bridge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'glute-bridge'), 'floor bridge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'glute-bridge'), 'hip bridge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'glute-bridge'), 'loaded bridge');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-romanian-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-romanian-deadlift'), 'db rdl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-romanian-deadlift'), 'dumbbell rdl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-romanian-deadlift'), 'dumbbell romanian dl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-romanian-deadlift'), 'db romanian deadlift');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'single-leg-romanian-deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-romanian-deadlift'), 'single leg rdl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-romanian-deadlift'), 'sl rdl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-romanian-deadlift'), 'one leg romanian deadlift');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-romanian-deadlift'), 'b-stance rdl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'kettlebell-swing');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-swing'), 'kb swing');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-swing'), 'russian swing');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-swing'), 'kettlebell hip swing');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-swing'), 'two hand swing');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'back-extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'back-extension'), 'hyperextension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'back-extension'), '45 degree back extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'back-extension'), 'roman chair extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'back-extension'), 'back raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-pull-through');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-pull-through'), 'pull through');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-pull-through'), 'cable hip hinge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-pull-through'), 'rope pull through');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-pull-through'), 'glute pull through');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-glute-kickback');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-glute-kickback'), 'glute kickback machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-glute-kickback'), 'cable kickback');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-glute-kickback'), 'kickback machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-glute-kickback'), 'glute pushback');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bench-press'), 'bench press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bench-press'), 'bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bench-press'), 'flat bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bench-press'), 'bb bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bench-press'), 'flat barbell press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-incline-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-incline-bench-press'), 'incline bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-incline-bench-press'), 'incline barbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-incline-bench-press'), 'bb incline bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-incline-bench-press'), 'incline press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'close-grip-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-bench-press'), 'cgbp');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-bench-press'), 'close grip bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-bench-press'), 'narrow grip bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-bench-press'), 'tricep bench press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pause-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-bench-press'), 'paused bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-bench-press'), 'pause bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-bench-press'), 'paused bench press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-bench-press'), 'competition bench');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'tempo-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-bench-press'), 'tempo bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-bench-press'), 'slow bench press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-bench-press'), 'controlled bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tempo-bench-press'), '3-second bench');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-bench-press'), 'db bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-bench-press'), 'dumbbell bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-bench-press'), 'flat dumbbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-bench-press'), 'db flat press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-incline-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-incline-press'), 'db incline press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-incline-press'), 'incline dumbbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-incline-press'), 'dumbbell incline bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-incline-press'), 'db incline bench');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-chest-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-chest-press'), 'chest press machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-chest-press'), 'seated chest press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-chest-press'), 'machine bench press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-chest-press'), 'hammer chest press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-chest-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-chest-press'), 'cable press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-chest-press'), 'standing cable press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-chest-press'), 'cable chest push');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-chest-press'), 'crossover press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'decline-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'decline-bench-press'), 'decline bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'decline-bench-press'), 'decline barbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'decline-bench-press'), 'bb decline bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'decline-bench-press'), 'decline press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'smith-machine-bench-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-bench-press'), 'smith bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-bench-press'), 'smith machine bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-bench-press'), 'guided bench press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'smith-machine-bench-press'), 'smith flat press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'push-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-up'), 'pushup');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-up'), 'press up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-up'), 'floor push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-up'), 'weighted push up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'chest-dip');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-dip'), 'chest dips');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-dip'), 'weighted chest dip');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-dip'), 'parallel bar dip');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-dip'), 'leaning dip');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-floor-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-floor-press'), 'db floor press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-floor-press'), 'dumbbell floor bench');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-floor-press'), 'floor dumbbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-floor-press'), 'db floor bench');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-overhead-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-overhead-press'), 'overhead press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-overhead-press'), 'ohp');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-overhead-press'), 'strict press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-overhead-press'), 'military press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-overhead-press'), 'shoulder press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'push-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-press'), 'barbell push press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-press'), 'leg drive press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-press'), 'dip drive press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'push-press'), 'bb push press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'seated-barbell-shoulder-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-barbell-shoulder-press'), 'seated ohp');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-barbell-shoulder-press'), 'seated barbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-barbell-shoulder-press'), 'seated military press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-barbell-shoulder-press'), 'seated shoulder press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-shoulder-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shoulder-press'), 'db shoulder press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shoulder-press'), 'dumbbell overhead press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shoulder-press'), 'seated dumbbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shoulder-press'), 'db ohp');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'arnold-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'arnold-press'), 'arnold dumbbell press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'arnold-press'), 'rotating shoulder press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'arnold-press'), 'arnie press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'arnold-press'), 'db arnold press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-shoulder-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shoulder-press'), 'shoulder press machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shoulder-press'), 'seated machine press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shoulder-press'), 'hammer shoulder press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shoulder-press'), 'overhead press machine');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'landmine-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-press'), 'landmine shoulder press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-press'), 'single arm landmine press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-press'), 'kneeling landmine press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-press'), 'landmine push');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'z-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'z-press'), 'seated floor press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'z-press'), 'z press overhead');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'z-press'), 'klokov press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'z-press'), 'floor seated press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pike-push-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pike-push-up'), 'pike pushup');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pike-push-up'), 'elevated pike push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pike-push-up'), 'shoulder push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pike-push-up'), 'pike press up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'handstand-push-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'handstand-push-up'), 'hspu');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'handstand-push-up'), 'handstand pushup');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'handstand-push-up'), 'wall handstand push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'handstand-push-up'), 'inverted push up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pull-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pull-up'), 'pullup');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pull-up'), 'pull ups');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pull-up'), 'weighted pull up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pull-up'), 'overhand pull up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pull-up'), 'wide grip pull up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'chin-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chin-up'), 'chinup');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chin-up'), 'chin ups');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chin-up'), 'weighted chin up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chin-up'), 'underhand pull up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chin-up'), 'supinated pull up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'lat-pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lat-pulldown'), 'lat pull down');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lat-pulldown'), 'wide grip pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lat-pulldown'), 'cable pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lat-pulldown'), 'pulldown');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'neutral-grip-pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'neutral-grip-pulldown'), 'neutral pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'neutral-grip-pulldown'), 'v-bar pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'neutral-grip-pulldown'), 'hammer grip pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'neutral-grip-pulldown'), 'parallel grip pulldown');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'close-grip-pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-pulldown'), 'close grip lat pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-pulldown'), 'narrow pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-pulldown'), 'underhand pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-pulldown'), 'supinated pulldown');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'assisted-pull-up-machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'assisted-pull-up-machine'), 'assisted pull up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'assisted-pull-up-machine'), 'gravitron pull up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'assisted-pull-up-machine'), 'machine assisted chin up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'assisted-pull-up-machine'), 'counterweight pull up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'straight-arm-pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'straight-arm-pulldown'), 'straight arm lat pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'straight-arm-pulldown'), 'stiff arm pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'straight-arm-pulldown'), 'cable lat pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'straight-arm-pulldown'), 'lat prayer');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'kneeling-cable-pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kneeling-cable-pulldown'), 'kneeling pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kneeling-cable-pulldown'), 'single arm kneeling pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kneeling-cable-pulldown'), 'half kneeling pulldown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kneeling-cable-pulldown'), 'tall kneeling pulldown');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-bent-over-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bent-over-row'), 'bent over row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bent-over-row'), 'barbell row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bent-over-row'), 'bb row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bent-over-row'), 'bent row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-bent-over-row'), 'bor');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pendlay-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pendlay-row'), 'pendlay');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pendlay-row'), 'dead stop row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pendlay-row'), 'pendlay barbell row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pendlay-row'), 'explosive row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'one-arm-dumbbell-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'one-arm-dumbbell-row'), 'one arm row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'one-arm-dumbbell-row'), 'single arm dumbbell row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'one-arm-dumbbell-row'), 'db row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'one-arm-dumbbell-row'), 'bench supported row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 't-bar-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 't-bar-row'), 't bar row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 't-bar-row'), 'tbar row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 't-bar-row'), 'landmine t-bar row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 't-bar-row'), 'plate loaded row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'seated-cable-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-cable-row'), 'cable row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-cable-row'), 'seated row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-cable-row'), 'low row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-cable-row'), 'seated cable pull');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'chest-supported-machine-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-machine-row'), 'chest supported row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-machine-row'), 'seal row machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-machine-row'), 'hammer strength row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-machine-row'), 'supported machine row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'inverted-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'inverted-row'), 'bodyweight row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'inverted-row'), 'australian pull up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'inverted-row'), 'supine row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'inverted-row'), 'ring row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'meadows-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'meadows-row'), 'meadows landmine row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'meadows-row'), 'single arm landmine row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'meadows-row'), 'meadow row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'meadows-row'), 'meadows barbell row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-chest-supported-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-chest-supported-row'), 'incline dumbbell row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-chest-supported-row'), 'db chest supported row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-chest-supported-row'), 'seal row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-chest-supported-row'), 'prone dumbbell row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-walking-lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-walking-lunge'), 'walking lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-walking-lunge'), 'db walking lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-walking-lunge'), 'dumbbell lunge walk');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-walking-lunge'), 'traveling lunge');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-lunge'), 'bb lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-lunge'), 'barbell forward lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-lunge'), 'back rack lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-lunge'), 'loaded lunge');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-reverse-lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-lunge'), 'reverse lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-lunge'), 'db reverse lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-lunge'), 'backward lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-lunge'), 'step back lunge');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'bulgarian-split-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bulgarian-split-squat'), 'bulgarian squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bulgarian-split-squat'), 'rear foot elevated split squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bulgarian-split-squat'), 'rfess');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bulgarian-split-squat'), 'bss');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-step-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-step-up'), 'step up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-step-up'), 'db step up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-step-up'), 'box step up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-step-up'), 'weighted step up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'split-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'split-squat'), 'static lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'split-squat'), 'stationary lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'split-squat'), 'db split squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'split-squat'), 'standing split squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'lateral-lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lateral-lunge'), 'side lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lateral-lunge'), 'cossack lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lateral-lunge'), 'lateral db lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lateral-lunge'), 'skater lunge');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'curtsy-lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'curtsy-lunge'), 'curtsey lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'curtsy-lunge'), 'crossover lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'curtsy-lunge'), 'db curtsy lunge');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'curtsy-lunge'), 'cross behind lunge');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'farmers-carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'farmers-carry'), 'farmers walk');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'farmers-carry'), 'db farmers carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'farmers-carry'), 'loaded carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'farmers-carry'), 'farmer carry');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'suitcase-carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'suitcase-carry'), 'single arm carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'suitcase-carry'), 'one side carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'suitcase-carry'), 'db suitcase carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'suitcase-carry'), 'offset carry');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'front-rack-carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'front-rack-carry'), 'front rack walk');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'front-rack-carry'), 'rack carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'front-rack-carry'), 'db front rack carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'front-rack-carry'), 'kettlebell front rack carry');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'overhead-carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-carry'), 'overhead walk');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-carry'), 'waiter carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-carry'), 'db overhead carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-carry'), 'bottoms up carry');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'kettlebell-farmers-carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-farmers-carry'), 'kb farmers carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-farmers-carry'), 'kettlebell carry');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-farmers-carry'), 'kb farmer walk');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'kettlebell-farmers-carry'), 'double kettlebell carry');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-curl'), 'bb curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-curl'), 'standing barbell curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-curl'), 'straight bar curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-curl'), 'bicep curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-curl'), 'db curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-curl'), 'standing dumbbell curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-curl'), 'alternating dumbbell curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-curl'), 'dumbbell bicep curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'hammer-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hammer-curl'), 'db hammer curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hammer-curl'), 'neutral grip curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hammer-curl'), 'hammer dumbbell curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hammer-curl'), 'cross body hammer curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'preacher-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'preacher-curl'), 'preacher bench curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'preacher-curl'), 'scott curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'preacher-curl'), 'barbell preacher curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'preacher-curl'), 'spider preacher curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'incline-dumbbell-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-curl'), 'incline curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-curl'), 'incline db curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-curl'), 'seated incline curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-curl'), 'bench incline curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-curl'), 'cable bicep curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-curl'), 'standing cable curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-curl'), 'low pulley curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-curl'), 'straight bar cable curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'concentration-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'concentration-curl'), 'seated concentration curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'concentration-curl'), 'db concentration curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'concentration-curl'), 'elbow on knee curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'concentration-curl'), 'isolation curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'spider-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'spider-curl'), 'prone incline curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'spider-curl'), 'db spider curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'spider-curl'), 'chest supported curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'spider-curl'), 'face down curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'reverse-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-curl'), 'reverse barbell curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-curl'), 'overhand curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-curl'), 'pronated curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-curl'), 'reverse grip curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-rope-hammer-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-rope-hammer-curl'), 'rope curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-rope-hammer-curl'), 'cable hammer curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-rope-hammer-curl'), 'rope cable curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-rope-hammer-curl'), 'neutral cable curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'tricep-pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tricep-pushdown'), 'tricep push down');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tricep-pushdown'), 'cable pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tricep-pushdown'), 'bar pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'tricep-pushdown'), 'straight bar pushdown');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'rope-pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rope-pushdown'), 'rope tricep pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rope-pushdown'), 'cable rope pushdown');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rope-pushdown'), 'tricep rope extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'rope-pushdown'), 'rope push down');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'overhead-cable-extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-cable-extension'), 'overhead tricep extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-cable-extension'), 'cable overhead extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-cable-extension'), 'rope overhead extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'overhead-cable-extension'), 'high cable extension');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-overhead-extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-overhead-extension'), 'db overhead extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-overhead-extension'), 'seated dumbbell extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-overhead-extension'), 'two hand overhead extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-overhead-extension'), 'french press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-skullcrusher');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-skullcrusher'), 'db skullcrusher');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-skullcrusher'), 'lying tricep extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-skullcrusher'), 'dumbbell lying extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-skullcrusher'), 'skull crusher');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-tricep-kickback');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-tricep-kickback'), 'tricep kickback');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-tricep-kickback'), 'db kickback');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-tricep-kickback'), 'bent over kickback');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-tricep-kickback'), 'dumbbell kickback');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'bench-dip');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bench-dip'), 'bench dips');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bench-dip'), 'tricep bench dip');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bench-dip'), 'seated dip');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'bench-dip'), 'chair dip');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'close-grip-push-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-push-up'), 'diamond push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-push-up'), 'triangle push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-push-up'), 'narrow push up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'close-grip-push-up'), 'tricep push up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-lateral-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-lateral-raise'), 'lateral raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-lateral-raise'), 'db lateral raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-lateral-raise'), 'side raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-lateral-raise'), 'side lateral raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-lateral-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-lateral-raise'), 'cable side raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-lateral-raise'), 'single arm cable raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-lateral-raise'), 'cable delt raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-lateral-raise'), 'low pulley lateral raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-front-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-front-raise'), 'front raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-front-raise'), 'db front raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-front-raise'), 'anterior raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-front-raise'), 'dumbbell front delt raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-rear-delt-fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-rear-delt-fly'), 'rear delt fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-rear-delt-fly'), 'bent over fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-rear-delt-fly'), 'reverse fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-rear-delt-fly'), 'db rear fly');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'reverse-pec-deck');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-pec-deck'), 'reverse fly machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-pec-deck'), 'rear delt machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-pec-deck'), 'reverse pec dec');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'reverse-pec-deck'), 'machine rear delt fly');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-face-pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-face-pull'), 'face pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-face-pull'), 'rope face pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-face-pull'), 'cable rear delt pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-face-pull'), 'high face pull');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-upright-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-upright-row'), 'upright row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-upright-row'), 'bb upright row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-upright-row'), 'barbell high pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-upright-row'), 'narrow upright row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-lateral-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-lateral-raise'), 'lateral raise machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-lateral-raise'), 'seated lateral raise machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-lateral-raise'), 'machine side raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-lateral-raise'), 'delt raise machine');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pec-deck');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pec-deck'), 'pec dec');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pec-deck'), 'chest fly machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pec-deck'), 'butterfly machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pec-deck'), 'seated chest fly');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-fly'), 'db fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-fly'), 'flat dumbbell fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-fly'), 'chest fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-fly'), 'flat fly');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-fly'), 'cable crossover');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-fly'), 'standing cable fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-fly'), 'cable chest fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-fly'), 'crossover fly');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'incline-dumbbell-fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-fly'), 'incline fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-fly'), 'incline db fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-fly'), 'upper chest fly');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'incline-dumbbell-fly'), 'incline chest fly');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-pullover');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-pullover'), 'db pullover');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-pullover'), 'cross bench pullover');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-pullover'), 'dumbbell chest pullover');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-pullover'), 'lying pullover');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'barbell-shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-shrug'), 'bb shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-shrug'), 'barbell trap shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-shrug'), 'standing barbell shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'barbell-shrug'), 'shrug');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shrug'), 'db shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shrug'), 'dumbbell trap shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shrug'), 'standing dumbbell shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-shrug'), 'db trap raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shrug'), 'shrug machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shrug'), 'smith machine shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shrug'), 'hammer shrug');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-shrug'), 'seated shrug machine');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'leg-extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-extension'), 'leg extensions');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-extension'), 'quad extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-extension'), 'knee extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-extension'), 'seated leg extension');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'seated-leg-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-leg-curl'), 'seated hamstring curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-leg-curl'), 'seated leg curls');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-leg-curl'), 'seated ham curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-leg-curl'), 'machine seated curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'lying-leg-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lying-leg-curl'), 'prone leg curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lying-leg-curl'), 'lying hamstring curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lying-leg-curl'), 'lying leg curls');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'lying-leg-curl'), 'machine lying curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'standing-calf-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'standing-calf-raise'), 'calf raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'standing-calf-raise'), 'standing calf raises');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'standing-calf-raise'), 'machine calf raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'standing-calf-raise'), 'gastroc raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'seated-calf-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-calf-raise'), 'seated calf raises');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-calf-raise'), 'soleus raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-calf-raise'), 'seated calf machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'seated-calf-raise'), 'bent knee calf raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'leg-press-calf-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press-calf-raise'), 'calf press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press-calf-raise'), 'leg press calf');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press-calf-raise'), 'sled calf raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'leg-press-calf-raise'), 'toe press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'hip-abduction-machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-abduction-machine'), 'hip abduction');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-abduction-machine'), 'abductor machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-abduction-machine'), 'outer thigh machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-abduction-machine'), 'glute abduction machine');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'hip-adduction-machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-adduction-machine'), 'hip adduction');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-adduction-machine'), 'adductor machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-adduction-machine'), 'inner thigh machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hip-adduction-machine'), 'groin machine');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'nordic-ham-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'nordic-ham-curl'), 'nordic curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'nordic-ham-curl'), 'nordic hamstring curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'nordic-ham-curl'), 'russian leg curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'nordic-ham-curl'), 'natural leg curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'hanging-leg-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hanging-leg-raise'), 'hanging leg raises');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hanging-leg-raise'), 'toes to bar');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hanging-leg-raise'), 'hanging knee raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'hanging-leg-raise'), 'bar leg raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-crunch');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-crunch'), 'kneeling cable crunch');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-crunch'), 'rope crunch');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-crunch'), 'cable ab crunch');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-crunch'), 'cable kneeling crunch');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'ab-wheel-rollout');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'ab-wheel-rollout'), 'ab wheel');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'ab-wheel-rollout'), 'ab rollout');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'ab-wheel-rollout'), 'wheel rollout');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'ab-wheel-rollout'), 'kneeling ab rollout');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'weighted-decline-sit-up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'weighted-decline-sit-up'), 'decline sit up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'weighted-decline-sit-up'), 'weighted sit up');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'weighted-decline-sit-up'), 'decline crunch');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'weighted-decline-sit-up'), 'bench sit up');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'captains-chair-leg-raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'captains-chair-leg-raise'), 'captains chair');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'captains-chair-leg-raise'), 'vertical knee raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'captains-chair-leg-raise'), 'roman chair leg raise');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'captains-chair-leg-raise'), 'power tower leg raise');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-wrist-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-wrist-curl'), 'wrist curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-wrist-curl'), 'db wrist curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-wrist-curl'), 'seated wrist curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-wrist-curl'), 'forearm curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-reverse-wrist-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-wrist-curl'), 'reverse wrist curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-wrist-curl'), 'wrist extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-wrist-curl'), 'db reverse wrist curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-reverse-wrist-curl'), 'extensor curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'sissy-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sissy-squat'), 'sissy squats');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sissy-squat'), 'bodyweight sissy squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sissy-squat'), 'quad sissy squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'sissy-squat'), 'assisted sissy squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'single-leg-press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-press'), 'one leg press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-press'), 'single leg press machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-press'), 'unilateral leg press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'single-leg-press'), 'one legged press');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-hip-thrust');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-hip-thrust'), 'hip thrust machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-hip-thrust'), 'glute drive machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-hip-thrust'), 'plate hip thrust');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-hip-thrust'), 'machine glute thrust');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'landmine-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-row'), 'landmine bent row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-row'), 'double handle landmine row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-row'), 't-handle landmine row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'landmine-row'), 'landmine barbell row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'chest-supported-t-bar-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-t-bar-row'), 'chest supported t-bar');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-t-bar-row'), 'incline t-bar row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-t-bar-row'), 'prone t-bar row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'chest-supported-t-bar-row'), 'supported t-bar row');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'pause-front-squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-front-squat'), 'paused front squat');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-front-squat'), 'pause front squats');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'pause-front-squat'), 'bottom pause front squat');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-preacher-curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-preacher-curl'), 'preacher curl machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-preacher-curl'), 'machine bicep curl');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-preacher-curl'), 'seated curl machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-preacher-curl'), 'plate preacher curl');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'machine-tricep-extension');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-tricep-extension'), 'tricep extension machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-tricep-extension'), 'seated tricep machine');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-tricep-extension'), 'machine tricep press');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'machine-tricep-extension'), 'plate tricep extension');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'dumbbell-upright-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-upright-row'), 'db upright row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-upright-row'), 'dumbbell high pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-upright-row'), 'dumbbell upright pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'dumbbell-upright-row'), 'db upright pull');
delete from exercise_aliases where exercise_id = (select id from exercises where slug = 'cable-upright-row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-upright-row'), 'cable high pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-upright-row'), 'low pulley upright row');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-upright-row'), 'cable upright pull');
insert into exercise_aliases (exercise_id, alias) values ((select id from exercises where slug = 'cable-upright-row'), 'rope upright row');

commit;

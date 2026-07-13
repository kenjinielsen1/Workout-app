-- UNITS.md — kilogram DISPLAY setting. Storage stays in pounds; this only records
-- the user's display unit and loadable-plate system. No weight column changes.

do $$ begin
  create type weight_unit as enum ('lb', 'kg');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plate_system as enum ('imperial', 'metric');
exception when duplicate_object then null; end $$;

alter table user_profile
  add column if not exists weight_unit  weight_unit  not null default 'lb',
  add column if not exists plate_system plate_system not null default 'imperial';

-- The recommendations.target_on_grid check assumed the universal 2.5 lb grid.
-- That is no longer true: INCREMENTS.md machines snap to their own step (3, 7,
-- 15 lb…) and metric barbells store the lb-equivalent of a kg-grid value. Both
-- are loadable but off the 2.5 grid, so this constraint would reject them.
-- Loadability is enforced in the app (snapToLoadable), so drop the DB check.
alter table recommendations drop constraint if exists target_on_grid;

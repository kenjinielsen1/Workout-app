-- PROGRAMMING.md Part A — proactive periodization toggle. The block anchor is
-- derived from the user's first logged session (deterministic, no extra column);
-- this flag just turns the planned hard/easy waves on or off.

alter table user_profile
  add column if not exists periodization_enabled boolean not null default true;

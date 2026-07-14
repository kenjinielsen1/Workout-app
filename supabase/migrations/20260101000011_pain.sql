-- SCOPE_SAFETY.md — capture a pain flag per set so the pain veto (freeze) is real
-- and the professional-referral pattern can be detected per movement. Two kinds:
-- 'muscular' and 'joint_sharp' (both freeze; joint/sharp escalates to a referral).

alter table sets
  add column if not exists pain text;

-- Idempotent: Postgres has no "add constraint if not exists" for CHECK, so guard
-- the duplicate so a full replay (fresh clone / recovery) doesn't abort here.
do $$ begin
  alter table sets
    add constraint pain_valid check (pain is null or pain in ('muscular', 'joint_sharp'));
exception when duplicate_object then null;
end $$;

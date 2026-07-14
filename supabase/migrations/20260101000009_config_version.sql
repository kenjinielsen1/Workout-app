-- EVIDENCE_CONFIG.md — record which evidence-config version produced each
-- recommendation, so any past recommendation is traceable to its evidence basis
-- (and so an A/B of config versions can be measured against outcomes).

alter table recommendations
  add column if not exists config_version int;

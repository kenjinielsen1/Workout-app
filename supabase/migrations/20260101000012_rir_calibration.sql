-- Audit fix #1 — the dynamic RIR calibration loop. rir_calibration_offset already
-- exists and is read by the engine; add the contribution count that gates when it
-- is trusted, plus when it was last updated (drives the ~weekly prompt cadence).

alter table user_profile
  add column if not exists rir_calibration_n       int not null default 0,
  add column if not exists rir_calibration_updated timestamptz;

-- Add 'auto' as a valid clock_out_status so the auto clock-out job can record
-- system-closed shifts distinctly from manager/late clock-outs.
-- Until this is applied, the backend (GET /api/timeclock/auto-clockout) falls
-- back to writing 'late'.

ALTER TABLE time_clock_entries DROP CONSTRAINT IF EXISTS valid_clock_out_status;

ALTER TABLE time_clock_entries
  ADD CONSTRAINT valid_clock_out_status
  CHECK (clock_out_status IN ('early','on_time','late','pending','manual','auto'));

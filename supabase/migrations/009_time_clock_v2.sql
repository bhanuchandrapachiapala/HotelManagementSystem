-- Drop existing tables and recreate cleanly
-- Safe because no real production data exists yet
DROP TABLE IF EXISTS time_clock_entries CASCADE;
DROP TABLE IF EXISTS time_clock_employees CASCADE;

-- Employees table — no department, just name
CREATE TABLE time_clock_employees (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tc_employee_name UNIQUE (name)
);

-- Default schedule per employee
-- shift_start and shift_end stored as TIME (e.g. '09:00:00', '16:00:00')
-- buffer_minutes: how many minutes before/after allowed for clock-in/out (default 30)
CREATE TABLE employee_schedules (
  id                BIGSERIAL PRIMARY KEY,
  employee_id       BIGINT    NOT NULL REFERENCES time_clock_employees(id) ON DELETE CASCADE,
  shift_start       TIME      NOT NULL DEFAULT '09:00:00',
  shift_end         TIME      NOT NULL DEFAULT '16:00:00',
  buffer_minutes    INTEGER   NOT NULL DEFAULT 30,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_employee_schedule UNIQUE (employee_id)
);

-- One-day schedule overrides
-- If a row exists for (employee_id, override_date), use these times instead of base schedule
-- If override_for_all is true, override_date applies to ALL employees for that date
CREATE TABLE schedule_overrides (
  id              BIGSERIAL PRIMARY KEY,
  employee_id     BIGINT    REFERENCES time_clock_employees(id) ON DELETE CASCADE,
  override_date   DATE      NOT NULL,
  shift_start     TIME      NOT NULL,
  shift_end       TIME      NOT NULL,
  buffer_minutes  INTEGER   NOT NULL DEFAULT 30,
  override_for_all BOOLEAN  NOT NULL DEFAULT false,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries
-- shift_date = DATE of clock_in_at (the work day this shift belongs to)
-- Night shifts crossing midnight: shift_date = date of clock_in, all hours counted to that date
CREATE TABLE time_clock_entries (
  id              BIGSERIAL PRIMARY KEY,
  employee_id     BIGINT    NOT NULL REFERENCES time_clock_employees(id) ON DELETE CASCADE,
  shift_date      DATE      NOT NULL,
  clock_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_at    TIMESTAMPTZ,
  total_minutes   NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN clock_out_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 60.0
    ELSE NULL END
  ) STORED,
  clock_in_status   TEXT    NOT NULL DEFAULT 'on_time',
  clock_out_status  TEXT    NOT NULL DEFAULT 'pending',
  notes           TEXT,
  edited_by       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_clock_in_status  CHECK (clock_in_status  IN ('early','on_time','late','manual')),
  CONSTRAINT valid_clock_out_status CHECK (clock_out_status IN ('early','on_time','late','pending','manual'))
);

CREATE INDEX IF NOT EXISTS idx_tc_employees_active   ON time_clock_employees(is_active);
CREATE INDEX IF NOT EXISTS idx_tc_entries_employee   ON time_clock_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_tc_entries_shift_date ON time_clock_entries(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_tc_entries_clock_in   ON time_clock_entries(clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_entries_open       ON time_clock_entries(employee_id) WHERE clock_out_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_overrides    ON schedule_overrides(override_date, employee_id);

ALTER TABLE time_clock_employees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides    ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_entries    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_tc_employees"  ON time_clock_employees  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_tc_schedules"  ON employee_schedules    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_tc_overrides"  ON schedule_overrides    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_tc_entries"    ON time_clock_entries    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Sample employees with default 9am-4pm schedule
INSERT INTO time_clock_employees (name) VALUES
  ('Maria Garcia'), ('James Wilson'), ('Sarah Johnson'), ('Alex Rivera')
ON CONFLICT (name) DO NOTHING;

INSERT INTO employee_schedules (employee_id, shift_start, shift_end, buffer_minutes)
SELECT id, '09:00:00', '16:00:00', 30 FROM time_clock_employees
ON CONFLICT (employee_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS time_clock_employees (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  department  TEXT        NOT NULL DEFAULT 'front_desk',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_employee_name UNIQUE (name),
  CONSTRAINT valid_department CHECK (department IN (
    'front_desk','housekeeping','maintenance','kitchen','management','other'
  ))
);

CREATE TABLE IF NOT EXISTS time_clock_entries (
  id            BIGSERIAL PRIMARY KEY,
  employee_id   BIGINT      NOT NULL REFERENCES time_clock_employees(id) ON DELETE CASCADE,
  clock_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_at  TIMESTAMPTZ,
  total_minutes NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN clock_out_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 60.0
    ELSE NULL END
  ) STORED,
  notes         TEXT,
  edited_by     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee  ON time_clock_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in  ON time_clock_entries(clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_date      ON time_clock_entries(DATE(clock_in_at));

ALTER TABLE time_clock_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_entries   ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_tc_employees" ON time_clock_employees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_tc_entries"   ON time_clock_entries   FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO time_clock_employees (name, department) VALUES
  ('Maria Garcia', 'housekeeping'),
  ('James Wilson', 'front_desk'),
  ('Sarah Johnson', 'housekeeping')
ON CONFLICT (name) DO NOTHING;

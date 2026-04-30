-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Housekeeping Module Migration
-- Run AFTER 001_initial_schema.sql
-- ══════════════════════════════════════════════════════

-- ── TABLE: housekeepers ──
CREATE TABLE IF NOT EXISTS housekeepers (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_housekeeper_name UNIQUE (name)
);

-- ── TABLE: room_assignments ──
CREATE TABLE IF NOT EXISTS room_assignments (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE        NOT NULL,
  room_number     TEXT        NOT NULL,
  floor           INTEGER     NOT NULL,
  housekeeper_id  BIGINT      NOT NULL REFERENCES housekeepers(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending',
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_room_per_day     UNIQUE (date, room_number),
  CONSTRAINT valid_room_status CHECK (status IN ('pending', 'in_progress', 'done'))
);

-- ── INDEXES ──
CREATE INDEX IF NOT EXISTS idx_room_assignments_date
  ON room_assignments(date);

CREATE INDEX IF NOT EXISTS idx_room_assignments_housekeeper
  ON room_assignments(housekeeper_id);

CREATE INDEX IF NOT EXISTS idx_room_assignments_date_hk
  ON room_assignments(date, housekeeper_id);

CREATE INDEX IF NOT EXISTS idx_room_assignments_status
  ON room_assignments(status);

-- ── TRIGGER: auto-update updated_at (reuses function from migration 001) ──
CREATE TRIGGER room_assignments_updated_at
  BEFORE UPDATE ON room_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── ROW LEVEL SECURITY ──
ALTER TABLE housekeepers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_housekeepers"
  ON housekeepers FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_housekeepers"
  ON housekeepers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_housekeepers"
  ON housekeepers FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_select_room_assignments"
  ON room_assignments FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_room_assignments"
  ON room_assignments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_room_assignments"
  ON room_assignments FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_delete_room_assignments"
  ON room_assignments FOR DELETE TO anon USING (true);

-- ── REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE room_assignments;

-- ── SAMPLE DATA (remove after testing) ──
INSERT INTO housekeepers (name) VALUES
  ('Maria Garcia'),
  ('James Wilson'),
  ('Sarah Johnson')
ON CONFLICT (name) DO NOTHING;

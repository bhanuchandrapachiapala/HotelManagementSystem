-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Initial Database Schema
-- ══════════════════════════════════════════════════════

-- ── TABLE 1: task_completions ──
CREATE TABLE IF NOT EXISTS task_completions (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE        NOT NULL,
  task_id       TEXT        NOT NULL,
  completed     BOOLEAN     NOT NULL DEFAULT true,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_task_per_day UNIQUE (date, task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_completions_date
  ON task_completions(date);

CREATE INDEX IF NOT EXISTS idx_task_completions_task_id
  ON task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_date_task
  ON task_completions(date, task_id);

-- ── TABLE 2: dinner_orders ──
CREATE TABLE IF NOT EXISTS dinner_orders (
  id              BIGSERIAL PRIMARY KEY,
  room_number     TEXT        NOT NULL,
  guest_initials  TEXT        NOT NULL,
  entree          TEXT        NOT NULL,
  sides           TEXT[]      NOT NULL DEFAULT '{}',
  dessert         TEXT        NOT NULL,
  drink           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'preparing', 'delivered')
  )
);

CREATE INDEX IF NOT EXISTS idx_dinner_orders_submitted_at
  ON dinner_orders(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dinner_orders_status
  ON dinner_orders(status);

CREATE INDEX IF NOT EXISTS idx_dinner_orders_room
  ON dinner_orders(room_number);

-- ── TRIGGER: auto-update updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dinner_orders_updated_at
  BEFORE UPDATE ON dinner_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── ROW LEVEL SECURITY ──
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinner_orders    ENABLE ROW LEVEL SECURITY;

-- task_completions: public read/write (employee checklist has no auth)
CREATE POLICY "anon_select_task_completions"
  ON task_completions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_task_completions"
  ON task_completions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_delete_task_completions"
  ON task_completions FOR DELETE TO anon USING (true);

-- dinner_orders: public insert (guests) + public read/update (admin via backend)
CREATE POLICY "anon_insert_dinner_orders"
  ON dinner_orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select_dinner_orders"
  ON dinner_orders FOR SELECT TO anon USING (true);

CREATE POLICY "anon_update_dinner_orders"
  ON dinner_orders FOR UPDATE TO anon USING (true);

-- ── SUPABASE REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE dinner_orders;

CREATE TABLE IF NOT EXISTS front_desk_task_completions (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE        NOT NULL,
  task_id       TEXT        NOT NULL,
  completed     BOOLEAN     NOT NULL DEFAULT true,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_fd_task_per_day UNIQUE (date, task_id)
);

CREATE INDEX IF NOT EXISTS idx_fd_completions_date ON front_desk_task_completions(date);
CREATE INDEX IF NOT EXISTS idx_fd_completions_task ON front_desk_task_completions(task_id);

ALTER TABLE front_desk_task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_fd_tasks" ON front_desk_task_completions FOR ALL TO anon USING (true) WITH CHECK (true);

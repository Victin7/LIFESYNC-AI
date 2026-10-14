
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_days int[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS duration_min int,
  ADD COLUMN IF NOT EXISTS energy text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS parent_task_id uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_rollover_date date;

CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON public.tasks(user_id, recurrence) WHERE recurrence <> 'none';

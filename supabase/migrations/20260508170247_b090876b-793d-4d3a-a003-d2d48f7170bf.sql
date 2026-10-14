CREATE TABLE public.google_tokens (
  user_id uuid PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  google_email text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all google_tokens" ON public.google_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_google_tokens
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_event_id text;
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON public.tasks(google_event_id);
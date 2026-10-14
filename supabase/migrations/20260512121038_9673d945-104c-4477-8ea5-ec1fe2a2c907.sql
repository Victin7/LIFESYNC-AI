-- Profiles: motivation cache + new prefs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS motivation_cache TEXT,
  ADD COLUMN IF NOT EXISTS motivation_cached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS peak_hour TEXT,
  ADD COLUMN IF NOT EXISTS auto_rollover BOOLEAN NOT NULL DEFAULT true;

-- AI memory
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all ai_memory" ON public.ai_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
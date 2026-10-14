-- Threads de conversa do chatbot
CREATE TABLE public.ai_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all ai_threads" ON public.ai_threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ai_threads_set_updated_at
  BEFORE UPDATE ON public.ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ai_threads_user_updated ON public.ai_threads(user_id, updated_at DESC);

-- Adiciona thread_id às mensagens existentes
ALTER TABLE public.ai_messages
  ADD COLUMN thread_id UUID REFERENCES public.ai_threads(id) ON DELETE CASCADE;

CREATE INDEX idx_ai_messages_thread_created ON public.ai_messages(thread_id, created_at);
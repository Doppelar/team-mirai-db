CREATE TABLE IF NOT EXISTS public.party_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_date DATE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT '',
  link_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS party_achievements_date_idx
  ON public.party_achievements (achievement_date DESC);

CREATE TRIGGER party_achievements_updated_at
  BEFORE UPDATE ON public.party_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.party_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "party_achievements_all"
  ON public.party_achievements
  FOR ALL
  USING (true)
  WITH CHECK (true);

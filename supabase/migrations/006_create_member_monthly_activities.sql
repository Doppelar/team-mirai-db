CREATE TABLE IF NOT EXISTS public.member_monthly_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  activity_month DATE NOT NULL,
  committee TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  link_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_monthly_activities_member_month_idx
  ON public.member_monthly_activities (member_id, activity_month DESC);

CREATE TRIGGER member_monthly_activities_updated_at
  BEFORE UPDATE ON public.member_monthly_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.member_monthly_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_monthly_activities_all"
  ON public.member_monthly_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

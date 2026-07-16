ALTER TABLE public.member_monthly_activities
ADD COLUMN IF NOT EXISTS committee TEXT DEFAULT '';

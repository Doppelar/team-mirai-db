ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS video_duration TEXT DEFAULT '';

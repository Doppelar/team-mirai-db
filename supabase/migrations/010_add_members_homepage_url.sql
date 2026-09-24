ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS homepage_url TEXT DEFAULT '';

-- members テーブルに Instagram URL カラムを追加
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '';

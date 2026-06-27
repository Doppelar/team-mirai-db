-- members テーブルに X URL カラムを追加
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS x_url TEXT DEFAULT '';

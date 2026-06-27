-- 投稿カテゴリ（週報 / ショート / 関連動画）をDBに用意し、
-- 既存データにもカテゴリを補完する

-- 旧「ロング動画」タグが存在し、「関連動画」が未作成なら名称を移行
DO $$
DECLARE
  related_tag_id UUID;
  legacy_long_tag_id UUID;
BEGIN
  SELECT id INTO related_tag_id
  FROM public.agenda
  WHERE name = '関連動画'
  LIMIT 1;

  SELECT id INTO legacy_long_tag_id
  FROM public.agenda
  WHERE name = 'ロング動画'
  LIMIT 1;

  IF related_tag_id IS NULL AND legacy_long_tag_id IS NOT NULL THEN
    UPDATE public.agenda
    SET
      name = '関連動画',
      color = '#059669',
      description = '関連動画用の分類タグ'
    WHERE id = legacy_long_tag_id;
  END IF;
END $$;

-- カテゴリタグを作成 or 更新（UNIQUE制約なしでも動く）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.agenda WHERE name = '週報') THEN
    UPDATE public.agenda
    SET color = '#2563EB', description = '週報用の分類タグ'
    WHERE name = '週報';
  ELSE
    INSERT INTO public.agenda (name, color, description)
    VALUES ('週報', '#2563EB', '週報用の分類タグ');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.agenda WHERE name = 'ショート') THEN
    UPDATE public.agenda
    SET color = '#7C3AED', description = 'ショート動画用の分類タグ'
    WHERE name = 'ショート';
  ELSE
    INSERT INTO public.agenda (name, color, description)
    VALUES ('ショート', '#7C3AED', 'ショート動画用の分類タグ');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.agenda WHERE name = '関連動画') THEN
    UPDATE public.agenda
    SET color = '#059669', description = '関連動画用の分類タグ'
    WHERE name = '関連動画';
  ELSE
    INSERT INTO public.agenda (name, color, description)
    VALUES ('関連動画', '#059669', '関連動画用の分類タグ');
  END IF;
END $$;

-- 既存投稿のうちカテゴリ未設定のものは「週報」に補完（MAX(uuid)を使わない）
WITH category_ids AS (
  SELECT
    (SELECT id FROM public.agenda WHERE name = '週報' LIMIT 1) AS weekly_id,
    (SELECT id FROM public.agenda WHERE name = 'ショート' LIMIT 1) AS short_id,
    (SELECT id FROM public.agenda WHERE name = '関連動画' LIMIT 1) AS related_id
),
targets AS (
  SELECT
    r.id,
    r.agenda_ids,
    c.weekly_id
  FROM public.reports r
  CROSS JOIN category_ids c
  WHERE c.weekly_id IS NOT NULL
    AND NOT (
      COALESCE(r.agenda_ids, '{}'::UUID[])
      && ARRAY[c.weekly_id, c.short_id, c.related_id]::UUID[]
    )
)
UPDATE public.reports r
SET agenda_ids = COALESCE(t.agenda_ids, '{}'::UUID[]) || ARRAY[t.weekly_id]::UUID[]
FROM targets t
WHERE r.id = t.id;

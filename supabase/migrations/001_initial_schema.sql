-- チームみらい活動アーカイブ 初期スキーマ

-- 出演者テーブル
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  x_url TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- タグ（議題）テーブル
CREATE TABLE IF NOT EXISTS agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 週報テーブル
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_date DATE NOT NULL,
  content TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  video_duration TEXT DEFAULT '',
  member_ids UUID[] DEFAULT '{}',
  agenda_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 登壇者ごとの月次活動メモ
CREATE TABLE IF NOT EXISTS member_monthly_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  activity_month DATE NOT NULL,
  committee TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  link_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 党全体の功績タイムライン
CREATE TABLE IF NOT EXISTS party_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_date DATE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT '',
  link_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER member_monthly_activities_updated_at
  BEFORE UPDATE ON member_monthly_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER party_achievements_updated_at
  BEFORE UPDATE ON party_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 全文検索用インデックス
CREATE INDEX IF NOT EXISTS reports_title_idx ON reports USING gin (to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS reports_content_idx ON reports USING gin (to_tsvector('simple', content));
CREATE INDEX IF NOT EXISTS reports_date_idx ON reports (report_date DESC);
CREATE INDEX IF NOT EXISTS member_monthly_activities_member_month_idx ON member_monthly_activities (member_id, activity_month DESC);
CREATE INDEX IF NOT EXISTS party_achievements_date_idx ON party_achievements (achievement_date DESC);
CREATE INDEX IF NOT EXISTS members_name_idx ON members (name);
CREATE INDEX IF NOT EXISTS agenda_name_idx ON agenda (name);

-- Row Level Security（開発用：全操作許可）
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_monthly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agenda_all" ON agenda FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "reports_all" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "member_monthly_activities_all" ON member_monthly_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "party_achievements_all" ON party_achievements FOR ALL USING (true) WITH CHECK (true);

-- サンプルデータ
INSERT INTO agenda (name, color, description) VALUES
  ('政策', '#EF4444', '政策に関する活動'),
  ('イベント', '#F59E0B', 'イベント・集会'),
  ('SNS', '#8B5CF6', 'SNS・メディア活動'),
  ('組織', '#10B981', '組織運営・内部活動')
ON CONFLICT (name) DO NOTHING;

INSERT INTO members (name, role, bio)
SELECT * FROM (VALUES
  ('安野たかひろ', '代表', 'チームみらい代表'),
  ('Sample Member', 'メンバー', 'サンプル出演者')
) AS v(name, role, bio)
WHERE NOT EXISTS (SELECT 1 FROM members LIMIT 1);

# チームみらい活動アーカイブ

React (Vite) + Supabase + Tailwind CSS で構築した週報アーカイブWebアプリです。

## 機能

- 週報一覧・登録・編集・削除
- 出演者一覧・管理
- タグ（agenda）管理
- YouTube動画埋め込み
- キーワード検索
- スマホ対応レスポンシブUI
- 日本語UI

## セットアップ

### 1. 依存関係のインストール

```bash
cd team-mirai-archive
npm install
```

### 2. Supabase プロジェクト作成

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editor で `supabase/migrations/001_initial_schema.sql` の内容を実行
3. Project Settings > API から URL と anon key を取得

### 3. 環境変数

```bash
cp .env.example .env
```

`.env` を編集:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## データベーステーブル

| テーブル | 説明 |
|---------|------|
| `reports` | 週報（タイトル、日付、内容、YouTube URL、出演者ID配列、タグID配列） |
| `members` | 出演者（名前、役割、プロフィール） |
| `agenda` | タグ（名前、色、説明） |

## ビルド

```bash
npm run build
npm run preview
```

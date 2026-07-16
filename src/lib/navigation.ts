export type AppNavItem = {
  to: string
  label: string
  description: string
  showInHeader?: boolean
}

export const appNavItems: AppNavItem[] = [
  {
    to: '/',
    label: '検索ページ',
    description: 'アプリ全体のページ一覧を説明付きで検索できます。',
  },
  {
    to: '/weekly-reports',
    label: '週報一覧',
    description: '週報カテゴリの投稿を検索・絞り込みできます。',
  },
  {
    to: '/shorts',
    label: 'ショート一覧',
    description: 'ショートカテゴリの動画投稿を一覧表示します。',
  },
  {
    to: '/related-videos',
    label: '関連動画',
    description: '関連動画カテゴリの投稿を一覧表示します。',
  },
  {
    to: '/party',
    label: '党全体',
    description: '月ごとの活動サマリーを党全体で確認できます。',
  },
  {
    to: '/members',
    label: '出演者',
    description: '出演者の管理と個人ページへの導線です。',
  },
  {
    to: '/agenda',
    label: 'タグ管理',
    description: 'タグの追加・編集・削除を行います。',
  },
  {
    to: '/links',
    label: 'リンク集',
    description: '関連サービスへの外部リンクをバナー形式で表示します。',
  },
  {
    to: '/reports/new',
    label: '投稿登録',
    description: '週報・ショート・関連動画を新規登録します。',
    showInHeader: false,
  },
]

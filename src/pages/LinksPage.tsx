const linkItems = [
  {
    title: 'チームみらい 公式サイト',
    subtitle: '公式',
    description:
      'チームみらいのミッション、活動内容、お知らせ、各種SNSへの導線をまとめて確認できます。',
    url: 'https://team-mir.ai/',
    accent: 'from-mirai-600 to-mirai-700',
  },
  {
    title: 'みらい議会',
    subtitle: '法案のやさしい解説',
    description:
      '国会で議論されている法案を、カテゴリ別に分かりやすく確認できるページです。',
    url: 'https://gikai.team-mir.ai/',
    accent: 'from-sky-600 to-indigo-700',
  },
  {
    title: 'チームみらい アクションボード',
    subtitle: '参加・応援アクション',
    description:
      'サポーター向けミッション、活動状況、ランキングなどを確認してアクションに参加できます。',
    url: 'https://action.team-mir.ai/',
    accent: 'from-fuchsia-600 to-pink-700',
  },
  {
    title: 'チームみらい 公式YouTubeチャンネル',
    subtitle: '公式動画',
    description:
      '週次報告や活動動画、最新コンテンツをまとめて視聴できます。',
    url: 'https://www.youtube.com/@team_mirai_jp',
    accent: 'from-red-600 to-rose-700',
  },
  {
    title: '国会中継（衆議院インターネット審議中継）',
    subtitle: 'ライブ・アーカイブ視聴',
    description:
      '衆議院の審議中継や過去映像アーカイブ、会議情報を確認できます。',
    url: 'https://www.shugiintv.go.jp/jp/',
    accent: 'from-emerald-600 to-teal-700',
  },
  {
    title: '第221回法案一覧',
    subtitle: '衆議院 議案情報',
    description: '第221回国会に関する議案情報の一覧ページです。',
    url: 'https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/menu.htm',
    accent: 'from-amber-500 to-orange-600',
  },
]

export default function LinksPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">リンク集</h1>
        <p className="text-sm text-gray-600 mt-1">
          主要サイトへすぐアクセスできる、バナー型リンク集です。
        </p>
      </div>

      <div className="grid gap-4">
        {linkItems.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group block rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
          >
            <div className={`bg-gradient-to-r ${item.accent} px-5 py-4 text-white`}>
              <p className="text-xs tracking-wide uppercase/80">{item.subtitle}</p>
              <h2 className="text-lg font-bold mt-1">{item.title}</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">{item.description}</p>
              <p className="mt-3 text-sm text-mirai-700 group-hover:text-mirai-800 font-medium">
                サイトを開く →
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

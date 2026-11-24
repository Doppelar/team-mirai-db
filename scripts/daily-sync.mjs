// 毎日の自動追加: YouTube と党の「国会記録」note から、新しい動画と議員の活動を Supabase に足す。
// 使い方: SUPABASE_URL=... SUPABASE_KEY=... node scripts/daily-sync.mjs [--dry-run] [--days=7]
//
// YouTube のチャンネルは、サイトの「出演者」に登録された youtube_url から読む。
// - 公式・安野さんのチャンネル → reports（週報 / 関連動画 / ショート）
// - ほかの出演者のチャンネル（ショート以外） → member_monthly_activities
// - 議員の note（NOTE_ACCOUNTS） → member_monthly_activities
// - 党の「国会記録」note（質疑・発言・討論の全文） → member_monthly_activities
// X・Instagram・Threads・TikTok はログインなしで投稿を読めないため対象外。
// すでにある動画（動画ID）・活動（リンク）は足さない。

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const DRY_RUN = process.argv.includes('--dry-run')
const DAYS = Number((process.argv.find((a) => a.startsWith('--days=')) || '--days=7').slice(7))
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL と SUPABASE_KEY を設定してください')

const since = new Date(Date.now() - DAYS * 86400000)
const UA = { 'User-Agent': 'Mozilla/5.0 (team-mirai-archive daily sync)', 'Accept-Language': 'ja' }

// 動画（reports）として登録する出演者。shorts: ショートも足すか
const VIDEO_MEMBERS = [
  { member: 'チームみらい公式', shorts: true },
  { member: '安野', shorts: false },
]
// 議員の note（サイトに note の欄がないのでここに書く）
const NOTE_ACCOUNTS = [
  { account: 'ymineshima_mirai', member: '峰島' },
  { account: 'btaros', member: '須田' },
  { account: 'aoifurukawa', member: '古川' },
  { account: 'dobassie', member: '土橋' },
]
const NOTE_RSS = 'https://note.com/team_mirai_log/rss'

// 動画のハッシュタグや note の名前（漢字）→ 出演者名の頭（DB の名前は空白を除いて前方一致で探す）
const ALIASES = {
  峰島侑也: '峰島', 高山聡史: '高山', 河合道雄: '河合', 古川あおい: '古川', 土橋章宏: '土橋',
  武藤かず子: '武藤', 安野貴博: '安野', 林拓海: '林', 小林修平: '小林', 須田英太郎: '須田',
  山田瑛理: '山田えり', 宇佐美登: '宇佐美', 加藤直樹: '加藤直樹', 山田ゆうじ: '山田ゆうじ',
}
// 話題タグ（既存のタグ名）とキーワード
const TOPICS = [
  ['消費税減税', /消費税|消費減税/],
  ['情報漏洩', /サイバー|情報漏洩|情報漏えい/],
  ['選挙制度', /定数削減|選挙制度|比例定数/],
  ['政治と金の問題', /調研費|政治資金|政治とカネ|政治と金/],
  ['裏話', /チみラジ/],
  ['雇用', /雇用|失業/],
  ['社会保障国民会議', /社会保障国民会議/],
]

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
async function db(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${path} ${text}`)
  return text ? JSON.parse(text) : null
}

const decode = (s) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const tag = (xml, name) => decode((xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)) || [])[1] || '').trim()
const jstDate = (d) => new Date(new Date(d).getTime() + 9 * 3600000).toISOString().slice(0, 10)
const videoIdOf = (u) => (u.match(/(?:youtu\.be\/|v=|live\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/) || [])[1]
const plain = (s) => s.replace(/[\s　]/g, '')

async function feed(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: UA })
  if (!res.ok) throw new Error(`YouTube RSS ${channelId}: ${res.status}`)
  return (await res.text()).split('<entry>').slice(1).map((e) => ({
    id: tag(e, 'yt:videoId'), title: tag(e, 'title'), published: tag(e, 'published'),
  }))
}

// youtube.com/channel/UC… はそのまま、@ハンドルはチャンネルのページから ID を読む
async function channelIdOf(url) {
  const direct = url.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/)
  if (direct) return direct[1]
  const handle = url.match(/\/@([^/?#]+)/)
  if (!handle) return null
  const html = await (await fetch(`https://www.youtube.com/@${handle[1]}`, { headers: UA })).text()
  return (html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) || [])[1] || null
}

async function isShort(id) {
  const res = await fetch(`https://www.youtube.com/shorts/${id}`, { headers: UA, redirect: 'manual' })
  return res.status === 200
}

async function videoInfo(id) {
  const html = await (await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: UA })).text()
  const desc = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)
  const sec = Number((html.match(/"lengthSeconds":"(\d+)"/) || [])[1] || 0)
  const live = /"isLiveContent":true/.test(html)
  const upcoming = /"isUpcoming":true/.test(html) || /"isLive":true/.test(html)
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  const two = (n) => String(n).padStart(2, '0')
  return {
    description: desc ? JSON.parse(`"${desc[1]}"`).slice(0, 3000) : '',
    duration: sec ? (h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`) : '',
    live, upcoming,
  }
}

async function main() {
  const [members, agenda, reports, activities] = await Promise.all([
    db('members?select=id,name,youtube_url'),
    db('agenda?select=id,name'),
    db('reports?select=youtube_url'),
    db('member_monthly_activities?select=link_url'),
  ])
  const member = (head) => members.find((m) => plain(m.name).startsWith(head) || (head === 'チームみらい公式' && m.name.includes('公式')))
  const tagId = (name) => agenda.find((a) => a.name === name)?.id
  const haveVideos = new Set(reports.map((r) => videoIdOf(r.youtube_url)).filter(Boolean))
  const haveLinks = new Set(activities.map((a) => a.link_url).filter(Boolean))
  const membersIn = (text) =>
    Object.entries(ALIASES).filter(([k]) => text.includes(k)).map(([, v]) => member(v)).filter(Boolean)

  const newReports = []
  const newActivities = []
  const warnings = []

  // サイトに登録された YouTube を、チャンネルIDにする
  const channels = []
  for (const m of members) {
    if (!m.youtube_url) continue
    const id = await channelIdOf(m.youtube_url)
    if (!id) { warnings.push(`YouTube のチャンネルが読めません: ${m.name} ${m.youtube_url}`); continue }
    const video = VIDEO_MEMBERS.find((v) => member(v.member)?.id === m.id)
    channels.push({ id, member: m, video: Boolean(video), shorts: video?.shorts ?? false })
  }

  // 1. 公式・安野さんのチャンネル → 動画
  for (const ch of channels.filter((c) => c.video)) {
    for (const v of await feed(ch.id)) {
      if (new Date(v.published) < since || haveVideos.has(v.id)) continue
      const short = await isShort(v.id)
      if (short && !ch.shorts) continue
      const info = await videoInfo(v.id)
      if (info.upcoming) continue // 配信前・配信中のものは、終わってから足す
      const kind = short ? 'ショート' : /週刊チームみらいNEWS/.test(v.title) ? '週報' : '関連動画'
      const who = membersIn(v.title)
      const fallback = ch.member
      const tags = [...TOPICS.filter(([, re]) => re.test(v.title)).map(([n]) => tagId(n)), tagId(kind)].filter(Boolean)
      newReports.push({
        id: crypto.randomUUID(),
        title: v.title.replace(/\s*#\S+/g, '').trim() || v.title,
        report_date: jstDate(v.published),
        content: info.description,
        youtube_url: short ? `https://youtube.com/shorts/${v.id}` : `https://youtu.be/${v.id}`,
        video_duration: short ? '' : info.duration,
        member_ids: (who.length ? who : fallback ? [fallback] : []).map((m) => m.id),
        agenda_ids: [...new Set(tags)],
      })
      haveVideos.add(v.id)
    }
  }

  // 2. ほかの出演者のチャンネル → 活動（ショートは除く）
  for (const ch of channels.filter((c) => !c.video)) {
    const m = ch.member
    for (const v of await feed(ch.id)) {
      const link = `https://www.youtube.com/watch?v=${v.id}`
      if (new Date(v.published) < since || haveLinks.has(link) || haveVideos.has(v.id)) continue
      if (await isShort(v.id)) continue
      newActivities.push({
        member_id: m.id, activity_month: jstDate(v.published), committee: 'YouTube',
        title: v.title.replace(/\s*#\S+/g, '').trim() || v.title, content: '本人の YouTube チャンネルで公開。', link_url: link,
      })
      haveLinks.add(link)
    }
  }

  // 3. 議員の note → 活動
  for (const n of NOTE_ACCOUNTS) {
    const m = member(n.member)
    if (!m) { warnings.push(`出演者が見つかりません: ${n.member}`); continue }
    const res = await fetch(`https://note.com/${n.account}/rss`, { headers: UA })
    if (!res.ok) { warnings.push(`note が読めません: ${n.account} ${res.status}`); continue }
    for (const item of (await res.text()).split('<item>').slice(1)) {
      const link = tag(item, 'link')
      const pub = tag(item, 'pubDate')
      if (!link || haveLinks.has(link) || new Date(pub) < since) continue
      const desc = tag(item, 'description').replace(/<[^>]+>/g, ' ').replace(/続きをみる/g, '').replace(/\s+/g, ' ').trim()
      newActivities.push({
        member_id: m.id, activity_month: jstDate(pub), committee: 'note',
        title: tag(item, 'title'), content: desc.slice(0, 500), link_url: link,
      })
      haveLinks.add(link)
    }
  }

  // 4. 国会記録 note → 活動
  const rss = await (await fetch(NOTE_RSS, { headers: UA })).text()
  for (const item of rss.split('<item>').slice(1)) {
    const title = tag(item, 'title')
    const link = tag(item, 'link')
    const pub = tag(item, 'pubDate')
    if (!link || haveLinks.has(link) || new Date(pub) < since) continue
    // 例: 【全文】衆議院 内閣委員会 質疑／国会対策委員長・高山聡史（2026年11月18日）
    const t = title.match(/^【全文】(\S+)\s+(.+?)\s+(質疑|発言|討論)／(?:.*・)?(.+?)（(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (!t) { warnings.push(`読めない題名: ${title}`); continue }
    const [, house, body, act, name, y, mo, d] = t
    const m = ALIASES[name] ? member(ALIASES[name]) : null
    if (!m) { warnings.push(`出演者が見つかりません: ${name}`); continue }
    const desc = tag(item, 'description').replace(/<[^>]+>/g, ' ').replace(/続きをみる/g, '').replace(/\s+/g, ' ').trim()
    const detail = (desc.match(/(案件[＝:：][\s\S]*|答弁者[＝:：][\s\S]*)$/) || [])[1] || ''
    newActivities.push({
      member_id: m.id,
      activity_month: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`,
      committee: `${house} ${body}`,
      title: `${body}で${act}`,
      content: (detail || desc).slice(0, 1000),
      link_url: link,
    })
    haveLinks.add(link)
  }

  console.log(`動画 ${newReports.length} 件`)
  for (const r of newReports) console.log(`  ${r.report_date} ${r.title}`)
  console.log(`活動 ${newActivities.length} 件`)
  for (const a of newActivities) console.log(`  ${a.activity_month} ${members.find((m) => m.id === a.member_id)?.name} ${a.title}`)
  for (const w of warnings) console.warn(`注意: ${w}`)
  if (DRY_RUN) return console.log('（--dry-run のため書き込んでいません）')

  if (newReports.length) await db('reports', { method: 'POST', body: JSON.stringify(newReports), headers: { Prefer: 'return=minimal' } })
  if (newActivities.length) await db('member_monthly_activities', { method: 'POST', body: JSON.stringify(newActivities), headers: { Prefer: 'return=minimal' } })
  console.log('書き込み完了')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

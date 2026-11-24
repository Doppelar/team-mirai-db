import type { Agenda } from '../types/database'

// 投稿の分類（分類タグの名前で見分ける）
export type ReportCategory = 'weekly' | 'short' | 'related' | 'press'

export const CATEGORY_TAGS: Array<{
  category: ReportCategory
  name: string
  keywords: string[]
  color: string
  description: string
}> = [
  { category: 'weekly', name: '週報', keywords: ['週報', 'weekly'], color: '#2563EB', description: '週報用の分類タグ' },
  { category: 'press', name: '定例会見', keywords: ['定例会見', 'press'], color: '#DC2626', description: '定例会見・党首会見用の分類タグ' },
  { category: 'short', name: 'ショート', keywords: ['ショート', 'short'], color: '#7C3AED', description: 'ショート動画用の分類タグ' },
  { category: 'related', name: '関連動画', keywords: ['関連動画', 'related'], color: '#059669', description: '関連動画用の分類タグ' },
]

/** タグが分類タグなら、その分類。 */
export function tagCategory(tag: Agenda): ReportCategory | null {
  const name = tag.name.toLowerCase()
  return CATEGORY_TAGS.find((c) => c.keywords.some((k) => name.includes(k)))?.category ?? null
}

export const isCategoryTag = (tag: Agenda) => tagCategory(tag) !== null

/** 分類タグの ID の集まり（絞り込みのタグ一覧から除くため）。 */
export function categoryTagIds(agenda: Agenda[]): Set<string> {
  return new Set(agenda.filter(isCategoryTag).map((tag) => tag.id))
}

/** 投稿の分類。ショート > 定例会見 > 関連動画 > 週報 の順に見る（どれもなければ週報）。 */
export function detectCategory(report: { agenda_ids: string[] }, agenda: Agenda[]): ReportCategory {
  const found = new Set(
    report.agenda_ids
      .map((id) => agenda.find((tag) => tag.id === id))
      .map((tag) => (tag ? tagCategory(tag) : null))
  )
  if (found.has('short')) return 'short'
  if (found.has('press')) return 'press'
  if (found.has('related')) return 'related'
  return 'weekly'
}

export const categoryLabel = (category: ReportCategory) =>
  CATEGORY_TAGS.find((c) => c.category === category)?.name ?? '週報'

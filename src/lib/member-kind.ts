import type { Member } from '../types/database'

/** 掲載している人・アカウントの区分。「議員」だけを数えて誤解を生まないように分ける。 */
export type MemberKind = '議員' | '候補者' | 'スタッフ' | '公式'

export const MEMBER_KINDS: readonly MemberKind[] = ['議員', '候補者', 'スタッフ', '公式']

/** 名前と肩書（role）から区分を決める。 */
export function memberKind(member: Pick<Member, 'name' | 'role'>): MemberKind {
  const role = member.role ?? ''
  if (member.name.includes('公式')) return '公式'
  if (/候補/.test(role)) return '候補者'
  if (/議員/.test(role)) return '議員'
  return 'スタッフ'
}

/** 区分ごとの人数（0人の区分は省く）。 */
export function countByKind(members: readonly Pick<Member, 'name' | 'role'>[]): { kind: MemberKind; count: number }[] {
  return MEMBER_KINDS.map((kind) => ({
    kind,
    count: members.filter((m) => memberKind(m) === kind).length,
  })).filter((x) => x.count > 0)
}

export function kindLabel(kind: MemberKind, count: number): string {
  return kind === '公式' ? `公式アカウント ${count}` : `${kind} ${count}名`
}

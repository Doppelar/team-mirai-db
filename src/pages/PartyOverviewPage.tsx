import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { fetchAgenda, fetchMembers, fetchReports } from '../lib/supabase'
import type { Agenda, Member, Report } from '../types/database'

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function detectCategory(report: Report, agenda: Agenda[]): 'weekly' | 'short' | 'related' {
  const tags = report.agenda_ids
    .map((id) => agenda.find((tag) => tag.id === id))
    .filter((tag): tag is Agenda => Boolean(tag))
    .map((tag) => tag.name.toLowerCase())
  if (tags.some((name) => name.includes('ショート') || name.includes('short'))) return 'short'
  if (tags.some((name) => name.includes('関連動画') || name.includes('related'))) return 'related'
  return 'weekly'
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export default function PartyOverviewPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [reportsData, membersData, agendaData] = await Promise.all([
          fetchReports(),
          fetchMembers(),
          fetchAgenda(),
        ])
        setReports(reportsData)
        setMembers(membersData)
        setAgenda(agendaData)
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const monthly = useMemo(() => {
    const map = new Map<
      string,
      { total: number; weekly: number; short: number; related: number; memberIds: Set<string> }
    >()
    reports.forEach((report) => {
      const key = monthKey(report.report_date)
      const existing = map.get(key) ?? {
        total: 0,
        weekly: 0,
        short: 0,
        related: 0,
        memberIds: new Set<string>(),
      }
      existing.total += 1
      const category = detectCategory(report, agenda)
      if (category === 'weekly') existing.weekly += 1
      if (category === 'short') existing.short += 1
      if (category === 'related') existing.related += 1
      report.member_ids.forEach((id) => existing.memberIds.add(id))
      map.set(key, existing)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        ...data,
        memberCount: data.memberIds.size,
      }))
  }, [reports, agenda])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">党全体ページ</h1>
        <p className="text-sm text-gray-600 mt-1">
          月ごとの活動件数と、週報・ショート・関連動画の内訳を表示します。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">総投稿数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{reports.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">登録議員数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{members.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">タグ数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{agenda.length}</p>
        </div>
      </div>

      {monthly.length === 0 && (
        <div className="text-center py-10 text-gray-500">まだ活動データがありません。</div>
      )}

      <div className="space-y-3">
        {monthly.map((item) => (
          <div key={item.month} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-lg font-semibold text-gray-900">
              {item.month.replace('-', '年')}月
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
              <span>総投稿: {item.total}件</span>
              <span>週報: {item.weekly}件</span>
              <span>ショート: {item.short}件</span>
              <span>関連動画: {item.related}件</span>
              <span>登壇議員: {item.memberCount}名</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

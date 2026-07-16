import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { fetchMembers, fetchReports, fetchAgenda } from '../lib/supabase'
import type { Agenda, Member, Report } from '../types/database'

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function toMonthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${year}年${month}月`
}

function detectCategory(report: Report, agenda: Agenda[]): '週報' | 'ショート' | '関連動画' {
  const tags = report.agenda_ids
    .map((id) => agenda.find((tag) => tag.id === id))
    .filter((tag): tag is Agenda => Boolean(tag))
    .map((tag) => tag.name.toLowerCase())
  if (tags.some((name) => name.includes('ショート') || name.includes('short'))) return 'ショート'
  if (tags.some((name) => name.includes('関連動画') || name.includes('related'))) return '関連動画'
  return '週報'
}

export default function MemberActivityPage() {
  const { id } = useParams<{ id: string }>()
  const [member, setMember] = useState<Member | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [membersData, reportsData, agendaData] = await Promise.all([
          fetchMembers(),
          fetchReports(),
          fetchAgenda(),
        ])
        setMember(membersData.find((m) => m.id === id) ?? null)
        setReports(reportsData.filter((report) => report.member_ids.includes(id)))
        setAgenda(agendaData)
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const monthlyGroups = useMemo(() => {
    const map = new Map<string, Report[]>()
    reports.forEach((report) => {
      const key = monthKey(report.report_date)
      const list = map.get(key) ?? []
      list.push(report)
      map.set(key, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, items]) => ({
        month,
        items: [...items].sort((a, b) => b.report_date.localeCompare(a.report_date)),
      }))
  }, [reports])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />
  if (!member) return <ErrorMessage message="議員情報が見つかりません" />

  return (
    <div>
      <div className="mb-4">
        <Link to="/members" className="text-sm text-mirai-600 hover:text-mirai-800">
          ← 出演者一覧に戻る
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
        {member.role && <p className="text-gray-500 mt-1">{member.role}</p>}
        <p className="text-sm text-gray-600 mt-2">月ごとの活動内容を一覧表示します。</p>
      </div>

      {monthlyGroups.length === 0 && (
        <div className="text-center py-10 text-gray-500">この議員の活動投稿はまだありません。</div>
      )}

      <div className="space-y-4">
        {monthlyGroups.map((group) => (
          <section key={group.month} className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">{toMonthLabel(group.month)}</h2>
            <p className="text-xs text-gray-500 mt-1">投稿数: {group.items.length}件</p>
            <div className="mt-3 space-y-2">
              {group.items.map((report) => (
                <Link
                  key={report.id}
                  to={`/reports/${report.id}`}
                  className="block rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-900">{report.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {report.report_date} ・ {detectCategory(report, agenda)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

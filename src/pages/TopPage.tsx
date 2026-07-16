import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import {
  fetchAgenda,
  fetchAllMemberMonthlyActivities,
  fetchMembers,
  fetchReports,
} from '../lib/supabase'
import type { Agenda, Member, MemberMonthlyActivity, Report } from '../types/database'

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
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

export default function TopPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [activities, setActivities] = useState<MemberMonthlyActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [membersData, reportsData, agendaData, activityData] = await Promise.all([
          fetchMembers(),
          fetchReports(),
          fetchAgenda(),
          fetchAllMemberMonthlyActivities(),
        ])
        setMembers(membersData.filter((member) => member.is_active))
        setReports(reportsData)
        setAgenda(agendaData)
        setActivities(activityData)
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const currentMonth = new Date().toISOString().slice(0, 7)
  const memberCards = useMemo(() => {
    return members.map((member) => {
      const memberReports = reports.filter(
        (report) => report.member_ids.includes(member.id) && monthKey(report.report_date) === currentMonth
      )
      const memberActivities = activities.filter(
        (activity) => activity.member_id === member.id && monthKey(activity.activity_month) === currentMonth
      )
      const committeeSet = new Set<string>()
      memberActivities.forEach((activity) => {
        if (activity.committee.trim()) committeeSet.add(activity.committee.trim())
      })
      memberReports.forEach((report) => {
        const tags = report.agenda_ids
          .map((id) => agenda.find((tag) => tag.id === id))
          .filter((tag): tag is Agenda => Boolean(tag))
        tags.forEach((tag) => {
          if (tag.name.includes('委員会')) committeeSet.add(tag.name)
        })
      })
      const latestReport = [...memberReports].sort((a, b) => b.report_date.localeCompare(a.report_date))[0]
      const latestActivity = [...memberActivities].sort((a, b) =>
        b.activity_month.localeCompare(a.activity_month)
      )[0]
      return {
        member,
        reportCount: memberReports.length,
        memoCount: memberActivities.length,
        committees: Array.from(committeeSet),
        latestReport,
        latestActivity,
      }
    })
  }, [members, reports, activities, currentMonth, agenda])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">TOPページ</h1>
        <p className="text-sm text-gray-600 mt-1">
          今月の議員活動を一覧で確認できます。過去の活動は各議員ページから参照できます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {memberCards.map(({ member, reportCount, memoCount, committees, latestReport, latestActivity }) => (
          <Link
            key={member.id}
            to={`/members/${member.id}`}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={`${member.name}の顔写真`}
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <span className="w-12 h-12 rounded-full bg-mirai-100 flex items-center justify-center text-lg font-bold text-mirai-700">
                  {member.name.charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">{member.name}</h2>
                {member.role && <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>}
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-700">
              <p>今月の動画投稿: {reportCount}件</p>
              <p>今月の月次入力: {memoCount}件</p>
            </div>

            {committees.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {committees.slice(0, 3).map((committee) => (
                  <span
                    key={committee}
                    className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800"
                  >
                    {committee}
                  </span>
                ))}
              </div>
            )}

            {latestReport && (
              <p className="mt-3 text-xs text-gray-600">
                最新投稿: {latestReport.report_date} ・ {latestReport.title}（
                {detectCategory(latestReport, agenda)}）
              </p>
            )}
            {latestActivity && (
              <p className="mt-1 text-xs text-gray-600">
                最新メモ: {latestActivity.activity_month.slice(0, 7)} ・ {latestActivity.title}
              </p>
            )}

            <p className="mt-3 text-sm text-mirai-700 font-medium">月別活動ページへ →</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

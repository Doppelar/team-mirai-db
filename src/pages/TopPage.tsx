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
  const currentMonthLabel = `${currentMonth.slice(0, 4)}年${currentMonth.slice(5, 7)}月`
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

  const monthSummary = useMemo(() => {
    let totalReports = 0
    let totalMemos = 0
    memberCards.forEach((card) => {
      totalReports += card.reportCount
      totalMemos += card.memoCount
    })
    return {
      memberCount: memberCards.length,
      totalReports,
      totalMemos,
    }
  }, [memberCards])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-mirai-700 via-mirai-600 to-sky-600 text-white p-6 sm:p-8 mb-6 shadow-lg">
        <p className="text-xs tracking-wide uppercase opacity-90">Team Mirai Activity Dashboard</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">TOPページ</h1>
        <p className="text-sm sm:text-base text-white/90 mt-2">
          {currentMonthLabel}の議員活動を、委員会情報付きでまとめて確認できます。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs">
            議員 {monthSummary.memberCount}名
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs">
            動画投稿 {monthSummary.totalReports}件
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs">
            月次メモ {monthSummary.totalMemos}件
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {memberCards.map(({ member, reportCount, memoCount, committees, latestReport, latestActivity }) => (
          <Link
            key={member.id}
            to={`/members/${member.id}`}
            className="group bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start gap-3">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={`${member.name}の顔写真`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <span className="w-12 h-12 rounded-full bg-mirai-100 flex items-center justify-center text-lg font-bold text-mirai-700 shadow-sm">
                  {member.name.charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">{member.name}</h2>
                {member.role && <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-gray-500">動画投稿</p>
                <p className="text-gray-900 font-semibold mt-0.5">{reportCount}件</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-gray-500">月次メモ</p>
                <p className="text-gray-900 font-semibold mt-0.5">{memoCount}件</p>
              </div>
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

            <div className="mt-3 space-y-1">
              {latestReport && (
                <p className="text-xs text-gray-600 line-clamp-1">
                  最新投稿: {latestReport.report_date} ・ {latestReport.title}（
                  {detectCategory(latestReport, agenda)}）
                </p>
              )}
              {latestActivity && (
                <p className="text-xs text-gray-600 line-clamp-1">
                  最新メモ: {latestActivity.activity_month.slice(0, 7)} ・ {latestActivity.title}
                </p>
              )}
            </div>

            <p className="mt-3 text-sm text-mirai-700 font-medium group-hover:text-mirai-800">
              月別活動ページへ →
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

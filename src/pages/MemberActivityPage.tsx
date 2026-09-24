import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import {
  createMemberMonthlyActivity,
  deleteMemberMonthlyActivity,
  fetchAgenda,
  fetchMemberMonthlyActivities,
  fetchMembers,
  fetchReports,
  updateMemberMonthlyActivity,
} from '../lib/supabase'
import type { Agenda, Member, MemberMonthlyActivity, Report } from '../types/database'

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
  const [activities, setActivities] = useState<MemberMonthlyActivity[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formDate, setFormDate] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formCommittee, setFormCommittee] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formLink, setFormLink] = useState('')
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [membersData, reportsData, agendaData, activitiesData] = await Promise.all([
          fetchMembers(),
          fetchReports(),
          fetchAgenda(),
          fetchMemberMonthlyActivities(id),
        ])
        setMember(membersData.find((m) => m.id === id) ?? null)
        setReports(reportsData.filter((report) => report.member_ids.includes(id)))
        setAgenda(agendaData)
        setActivities(activitiesData)
        setFormDate(new Date().toISOString().slice(0, 10))
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const resetForm = () => {
    setEditingActivityId(null)
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormTitle('')
    setFormCommittee('')
    setFormContent('')
    setFormLink('')
  }

  const handleSaveActivity = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (!formDate || !formTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingActivityId) {
        const updated = await updateMemberMonthlyActivity(editingActivityId, {
          activity_month: formDate,
          committee: formCommittee.trim(),
          title: formTitle.trim(),
          content: formContent.trim(),
          link_url: formLink.trim(),
        })
        setActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await createMemberMonthlyActivity({
          member_id: id,
          activity_month: formDate,
          committee: formCommittee.trim(),
          title: formTitle.trim(),
          content: formContent.trim(),
          link_url: formLink.trim(),
        })
        setActivities((prev) => [created, ...prev])
      }
      resetForm()
    } catch (e) {
      setError(stringifyError(e))
    } finally {
      setSaving(false)
    }
  }

  const handleEditActivity = (activity: MemberMonthlyActivity) => {
    setEditingActivityId(activity.id)
    setFormDate(activity.activity_month.slice(0, 10))
    setFormTitle(activity.title)
    setFormCommittee(activity.committee)
    setFormContent(activity.content)
    setFormLink(activity.link_url)
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('この月次活動を削除しますか？')) return
    try {
      await deleteMemberMonthlyActivity(activityId)
      setActivities((prev) => prev.filter((item) => item.id !== activityId))
    } catch (e) {
      setError(stringifyError(e))
    }
  }

  const monthlyGroups = useMemo(() => {
    const map = new Map<
      string,
      { reports: Report[]; activities: MemberMonthlyActivity[] }
    >()
    reports.forEach((report) => {
      const key = monthKey(report.report_date)
      const group = map.get(key) ?? { reports: [], activities: [] }
      group.reports.push(report)
      map.set(key, group)
    })
    activities.forEach((activity) => {
      const key = monthKey(activity.activity_month)
      const group = map.get(key) ?? { reports: [], activities: [] }
      group.activities.push(activity)
      map.set(key, group)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, group]) => ({
        month,
        reports: [...group.reports].sort((a, b) => b.report_date.localeCompare(a.report_date)),
        activities: [...group.activities].sort((a, b) => b.activity_month.localeCompare(a.activity_month)),
      }))
  }, [reports, activities])

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
        {member.homepage_url && (
          <a
            href={member.homepage_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-mirai-700 hover:text-mirai-900 mt-2"
          >
            ホームページ
          </a>
        )}
        <p className="text-sm text-gray-600 mt-2">月ごとの活動内容を一覧表示します。</p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingActivityId ? '活動を編集' : '活動を入力'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          動画以外の活動も日付つきで記録できます。表示は月ごと・日付順です。
        </p>
        <form onSubmit={handleSaveActivity} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">委員会・分野</label>
            <input
              type="text"
              value={formCommittee}
              onChange={(e) => setFormCommittee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="例: 総務委員会 / 教育政策"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="例: 地域ミーティング参加"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="活動内容を入力..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">リンク（任意）</label>
            <input
              type="url"
              value={formLink}
              onChange={(e) => setFormLink(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : editingActivityId ? '活動を更新' : '活動を保存'}
            </button>
            {editingActivityId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </section>

      {monthlyGroups.length === 0 && (
        <div className="text-center py-10 text-gray-500">この議員の活動投稿はまだありません。</div>
      )}

      <div className="space-y-4">
        {monthlyGroups.map((group) => (
          <section key={group.month} className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">{toMonthLabel(group.month)}</h2>
            <p className="text-xs text-gray-500 mt-1">
              投稿: {group.reports.length}件 / 月次入力: {group.activities.length}件
            </p>
            <div className="mt-3 space-y-2">
              {group.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-sky-900">{activity.title}</p>
                      <p className="text-xs text-sky-700 mt-0.5">日付: {activity.activity_month.slice(0, 10)}</p>
                      {activity.committee && (
                        <p className="text-xs text-sky-700 mt-0.5">委員会: {activity.committee}</p>
                      )}
                      {activity.content && (
                        <p className="text-sm text-sky-800 mt-1 whitespace-pre-wrap">
                          {activity.content}
                        </p>
                      )}
                      {activity.link_url && (
                        <a
                          href={activity.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-700 underline mt-1 inline-block"
                        >
                          関連リンク
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditActivity(activity)}
                        className="text-xs text-sky-700 hover:text-sky-900"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {group.reports.map((report) => (
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

import { useEffect, useState, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import {
  fetchReport,
  fetchMembers,
  fetchAgenda,
  createReport,
  updateReport,
  createAgenda,
} from '../lib/supabase'
import type { Member, Agenda } from '../types/database'

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return JSON.stringify(
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      null,
      2
    )
  }

  if (error === null || error === undefined) return String(error)
  if (typeof error !== 'object') return String(error)

  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

function isWeeklyTag(tag: Agenda): boolean {
  const normalizedName = tag.name.toLowerCase()
  return normalizedName.includes('週報') || normalizedName.includes('weekly')
}

export default function ReportFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [content, setContent] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [selectedAgendaIds, setSelectedAgendaIds] = useState<string[]>([])

  const [members, setMembers] = useState<Member[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [membersData, initialAgendaData] = await Promise.all([
          fetchMembers(true),
          fetchAgenda(),
        ])
        setMembers(membersData)
        let agendaData = initialAgendaData
        let weeklyTag = agendaData.find(isWeeklyTag)

        if (!weeklyTag) {
          try {
            await createAgenda({
              name: '週報',
              color: '#2563EB',
              description: '週報用の分類タグ',
            })
            agendaData = await fetchAgenda()
            weeklyTag = agendaData.find(isWeeklyTag)
          } catch (createError) {
            console.error('Failed to auto-create weekly tag', createError)
          }
        }

        setAgenda(agendaData)

        if (id) {
          const report = await fetchReport(id)
          setTitle(report.title)
          setReportDate(report.report_date)
          setContent(report.content)
          setYoutubeUrl(report.youtube_url)
          setSelectedMemberIds(report.member_ids)
          const nextAgendaIds = weeklyTag
            ? Array.from(new Set([...report.agenda_ids, weeklyTag.id]))
            : report.agenda_ids
          setSelectedAgendaIds(nextAgendaIds)
        } else {
          setReportDate(new Date().toISOString().split('T')[0])
          if (weeklyTag) {
            setSelectedAgendaIds((prev) =>
              prev.includes(weeklyTag.id) ? prev : [...prev, weeklyTag.id]
            )
          }
        }
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId]
    )
  }

  const toggleAgenda = (agendaId: string) => {
    setSelectedAgendaIds((prev) =>
      prev.includes(agendaId) ? prev.filter((x) => x !== agendaId) : [...prev, agendaId]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !reportDate) return

    setSubmitting(true)
    setError(null)
    try {
      const weeklyTag = agenda.find(isWeeklyTag)
      const agendaIdsWithWeekly = weeklyTag
        ? Array.from(new Set([...selectedAgendaIds, weeklyTag.id]))
        : selectedAgendaIds

      const payload = {
        title: title.trim(),
        report_date: reportDate,
        content: content.trim(),
        youtube_url: youtubeUrl.trim(),
        member_ids: selectedMemberIds,
        agenda_ids: agendaIdsWithWeekly,
      }

      if (isEdit && id) {
        await updateReport(id, payload)
        navigate(`/reports/${id}`)
      } else {
        const created = await createReport(payload)
        navigate(`/reports/${created.id}`)
      }
    } catch (e) {
      console.error('Failed to save report', e)
      setError(stringifyError(e))
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-4">
        <Link
          to={isEdit && id ? `/reports/${id}` : '/'}
          className="text-sm text-mirai-600 hover:text-mirai-800"
        >
          ← 戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '週報を編集' : '週報を登録'}
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
            placeholder="週報のタイトル"
          />
        </div>

        <div>
          <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">
            期間 <span className="text-red-500">*</span>
          </label>
          <input
            id="reportDate"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
          />
          <p className="text-xs text-gray-500 mt-1">活動期間の基準日を選択してください。</p>
        </div>

        <div>
          <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 mb-1">
            YouTube URL
          </label>
          <input
            id="youtubeUrl"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            概要
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500 resize-y"
            placeholder="活動概要を記入..."
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">登壇者</span>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">
              出演者が登録されていません。
              <Link to="/members" className="text-mirai-600 hover:underline ml-1">
                出演者を追加
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-sm ${
                    selectedMemberIds.includes(member.id)
                      ? 'border-mirai-500 bg-mirai-50 text-mirai-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="sr-only"
                  />
                  {member.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">タグ</span>
          {agenda.length === 0 ? (
            <p className="text-sm text-gray-500">
              タグが登録されていません。
              <Link to="/agenda" className="text-mirai-600 hover:underline ml-1">
                タグを追加
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {agenda.map((tag) => (
                <label
                  key={tag.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-sm ${
                    selectedAgendaIds.includes(tag.id)
                      ? 'border-mirai-500 bg-mirai-50 text-mirai-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAgendaIds.includes(tag.id)}
                    onChange={() => toggleAgenda(tag.id)}
                    className="sr-only"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 transition-colors font-medium disabled:opacity-50"
          >
            {submitting ? '保存中...' : isEdit ? '更新する' : '登録する'}
          </button>
          <Link
            to={isEdit && id ? `/reports/${id}` : '/'}
            className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}

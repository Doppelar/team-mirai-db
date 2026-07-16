import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import YouTubeEmbed from '../components/YouTubeEmbed'
import TagBadge from '../components/TagBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import {
  fetchReport,
  fetchMembers,
  fetchAgenda,
  deleteReport,
  resolveMembers,
  resolveAgenda,
} from '../lib/supabase'
import type { Report, Member, Agenda } from '../types/database'

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

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [reportData, membersData, agendaData] = await Promise.all([
          fetchReport(id),
          fetchMembers(),
          fetchAgenda(),
        ])
        setReport(reportData)
        setMembers(membersData)
        setAgenda(agendaData)
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!id || !confirm('この週報を削除しますか？')) return
    setDeleting(true)
    try {
      await deleteReport(id)
      navigate('/weekly-reports')
    } catch (e) {
      console.error('Failed to delete report', e)
      setError(stringifyError(e))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />
  if (!report) return <ErrorMessage message="週報が見つかりません" />

  const reportMembers = resolveMembers(report.member_ids, members)
  const reportTags = resolveAgenda(report.agenda_ids, agenda)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/weekly-reports" className="text-sm text-mirai-600 hover:text-mirai-800">
          ← 週報一覧に戻る
        </Link>
      </div>

      <article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {report.youtube_url && (
          <div className="p-4 sm:p-6">
            <YouTubeEmbed url={report.youtube_url} title={report.title} />
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <time className="text-sm text-gray-500">期間: {formatDate(report.report_date)}</time>
            {report.video_duration && (
              <p className="text-sm text-gray-500 mt-1">動画時間: {report.video_duration}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{report.title}</h1>
          </div>

          {report.youtube_url && (
            <div>
              <a
                href={report.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-mirai-50 text-mirai-700 hover:bg-mirai-100"
              >
                YouTubeで開く
              </a>
            </div>
          )}

          {reportTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reportTags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} size="md" />
              ))}
            </div>
          )}

          {reportMembers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">登壇者</h2>
              <div className="flex flex-wrap gap-2">
                {reportMembers.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm"
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={`${member.name}の顔写真`}
                        className="w-6 h-6 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-mirai-200 flex items-center justify-center text-xs font-medium text-mirai-700">
                        {member.name.charAt(0)}
                      </span>
                    )}
                    {member.name}
                    {member.role && (
                      <span className="text-gray-400 text-xs">({member.role})</span>
                    )}
                    {member.instagram_url && (
                      <a
                        href={member.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-mirai-600 hover:text-mirai-800 text-xs"
                      >
                        Instagram
                      </a>
                    )}
                    {member.x_url && (
                      <a
                        href={member.x_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:text-sky-800 text-xs"
                      >
                        X
                      </a>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.content && (
            <div className="prose prose-sm max-w-none">
              <h2 className="text-sm font-medium text-gray-500 mb-2">概要</h2>
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {report.content}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Link
              to={`/reports/${report.id}/edit`}
              className="px-4 py-2 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 transition-colors text-sm font-medium"
            >
              編集
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {deleting ? '削除中...' : '削除'}
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

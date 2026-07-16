import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import TagBadge from '../components/TagBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfigWarning from '../components/ConfigWarning'
import {
  fetchReports,
  fetchMembers,
  fetchAgenda,
  resolveMembers,
  resolveAgenda,
  isSupabaseConfigured,
} from '../lib/supabase'
import { getYouTubeThumbnail } from '../lib/youtube'
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

function isShortTag(tag: Agenda): boolean {
  const normalizedName = tag.name.toLowerCase()
  return normalizedName.includes('ショート') || normalizedName.includes('short')
}

function isWeeklyTag(tag: Agenda): boolean {
  const normalizedName = tag.name.toLowerCase()
  return normalizedName.includes('週報') || normalizedName.includes('weekly')
}

function isRelatedTag(tag: Agenda): boolean {
  const normalizedName = tag.name.toLowerCase()
  return normalizedName.includes('関連動画') || normalizedName.includes('related')
}

export default function LongVideosPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [search, setSearch] = useState('')
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
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

  useEffect(() => {
    loadData()
  }, [])

  const shortTagIds = useMemo(
    () => new Set(agenda.filter(isShortTag).map((tag) => tag.id)),
    [agenda]
  )
  const weeklyTagIds = useMemo(
    () => new Set(agenda.filter(isWeeklyTag).map((tag) => tag.id)),
    [agenda]
  )
  const relatedTagIds = useMemo(
    () => new Set(agenda.filter(isRelatedTag).map((tag) => tag.id)),
    [agenda]
  )
  const categoryTagIds = useMemo(
    () => new Set([...shortTagIds, ...weeklyTagIds, ...relatedTagIds]),
    [shortTagIds, weeklyTagIds, relatedTagIds]
  )
  const relatedVideoReports = useMemo(
    () =>
      reports.filter(
        (report) => {
          if (!report.youtube_url?.trim()) return false
          const category = report.agenda_ids.some((tagId) => shortTagIds.has(tagId))
            ? 'short'
            : report.agenda_ids.some((tagId) => relatedTagIds.has(tagId))
            ? 'related'
            : 'weekly'
          return category === 'related'
        }
      ),
    [reports, shortTagIds, relatedTagIds]
  )

  const selectableTags = useMemo(() => {
    const tagIds = new Set<string>()
    relatedVideoReports.forEach((report) => {
      report.agenda_ids.forEach((tagId) => {
        if (!categoryTagIds.has(tagId)) tagIds.add(tagId)
      })
    })
    return agenda.filter((tag) => tagIds.has(tag.id))
  }, [agenda, relatedVideoReports, categoryTagIds])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredReports = relatedVideoReports.filter((report) => {
    const matchesMember = !activeMemberId || report.member_ids.includes(activeMemberId)
    if (!matchesMember) return false

    const matchesTag = !activeTagId || report.agenda_ids.includes(activeTagId)
    if (!matchesTag) return false

    if (!normalizedSearch) return true

    const reportTags = resolveAgenda(report.agenda_ids, agenda)
    const tagsText = reportTags.map((tag) => tag.name).join(' ')
    return [report.title, report.content, tagsText]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })

  const sortedReports = [...filteredReports].sort((a, b) =>
    b.report_date.localeCompare(a.report_date)
  )

  return (
    <div>
      <ConfigWarning show={!isSupabaseConfigured} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">関連動画一覧</h1>
        <Link
          to="/reports/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 transition-colors font-medium text-sm"
        >
          + 新規登録
        </Link>
      </div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="タイトル・概要・タグで検索..."
        />
      </div>

      {members.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">登壇者で絞り込み</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveMemberId(null)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeMemberId === null
                  ? 'bg-mirai-600 text-white border-mirai-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              すべて
            </button>
            {members
              .filter((member) => member.is_active)
              .map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setActiveMemberId(member.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    activeMemberId === member.id
                      ? 'bg-mirai-600 text-white border-mirai-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                  aria-pressed={activeMemberId === member.id}
                >
                  {member.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {selectableTags.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">タグで絞り込み</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTagId(null)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTagId === null
                  ? 'bg-mirai-600 text-white border-mirai-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              すべて
            </button>
            {selectableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setActiveTagId(tag.id)}
                className={`rounded-full transition-transform ${
                  activeTagId === tag.id
                    ? 'ring-2 ring-mirai-400 ring-offset-2 scale-105'
                    : 'hover:scale-105'
                }`}
                aria-pressed={activeTagId === tag.id}
              >
                <TagBadge name={tag.name} color={tag.color} size="md" />
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={loadData} />}

      {!loading && !error && relatedVideoReports.length === 0 && (
        <div className="text-center py-12 text-gray-500">関連動画の投稿がまだ登録されていません</div>
      )}

      {!loading && !error && relatedVideoReports.length > 0 && sortedReports.length === 0 && (
        <div className="text-center py-12 text-gray-500">検索結果がありません</div>
      )}

      {!loading && !error && sortedReports.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedReports.map((report) => {
            const reportMembers = resolveMembers(report.member_ids, members)
            const reportTags = resolveAgenda(report.agenda_ids, agenda).filter(
              (tag) => !categoryTagIds.has(tag.id)
            )
            const thumbnail = getYouTubeThumbnail(report.youtube_url)

            return (
              <article
                key={report.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                    サムネイル未取得
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <time className="text-xs text-gray-500">期間: {formatDate(report.report_date)}</time>
                  {report.video_duration && (
                    <p className="text-xs text-gray-500">動画時間: {report.video_duration}</p>
                  )}
                  <h2 className="font-semibold text-gray-900 line-clamp-2">{report.title}</h2>
                  {report.content && <p className="text-sm text-gray-600 line-clamp-2">{report.content}</p>}
                  {reportTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reportTags.map((tag) => (
                        <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                      ))}
                    </div>
                  )}
                  {reportMembers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-auto pt-2">
                      登壇者: {reportMembers.map((m) => m.name).join('、')}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    {report.youtube_url && (
                      <a
                        href={report.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-mirai-600 hover:text-mirai-800 underline"
                      >
                        動画を見る
                      </a>
                    )}
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { FormEvent, useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import {
  createPartyAchievement,
  deletePartyAchievement,
  fetchPartyAchievements,
} from '../lib/supabase'
import type { PartyAchievement } from '../types/database'

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export default function PartyOverviewPage() {
  const [achievements, setAchievements] = useState<PartyAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formDate, setFormDate] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formImpact, setFormImpact] = useState('')
  const [formLink, setFormLink] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const achievementsData = await fetchPartyAchievements()
        setAchievements(achievementsData)
        setFormDate(new Date().toISOString().slice(0, 10))
      } catch (e) {
        setError(stringifyError(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreateAchievement = async (e: FormEvent) => {
    e.preventDefault()
    if (!formDate || !formTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await createPartyAchievement({
        achievement_date: formDate,
        title: formTitle.trim(),
        summary: formSummary.trim(),
        impact: formImpact.trim(),
        link_url: formLink.trim(),
      })
      setAchievements((prev) => [created, ...prev])
      setFormTitle('')
      setFormSummary('')
      setFormImpact('')
      setFormLink('')
    } catch (e) {
      setError(stringifyError(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAchievement = async (id: string) => {
    if (!confirm('この功績を削除しますか？')) return
    try {
      await deletePartyAchievement(id)
      setAchievements((prev) => prev.filter((item) => item.id !== id))
    } catch (e) {
      setError(stringifyError(e))
    }
  }

  const monthly = useMemo(() => {
    const map = new Map<string, PartyAchievement[]>()
    achievements.forEach((achievement) => {
      const key = monthKey(achievement.achievement_date)
      const list = map.get(key) ?? []
      list.push(achievement)
      map.set(key, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, items]) => ({
        month,
        items: [...items].sort((a, b) => b.achievement_date.localeCompare(a.achievement_date)),
      }))
  }, [achievements])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">党全体ページ</h1>
        <p className="text-sm text-gray-600 mt-1">
          党として残した功績を、月ごとに時系列で登録・管理できます。
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">功績を登録</h2>
        <p className="text-sm text-gray-600 mt-1">
          法案対応、委員会活動、政策実現などを時系列で残せます。
        </p>
        <form onSubmit={handleCreateAchievement} className="mt-4 space-y-3">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="例: 防災関連法案の修正案を提出"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">概要</label>
            <textarea
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="何を実施したか..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">成果・インパクト</label>
            <textarea
              value={formImpact}
              onChange={(e) => setFormImpact(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="どのような成果につながったか..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">参考リンク（任意）</label>
            <input
              type="url"
              value={formLink}
              onChange={(e) => setFormLink(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '功績を保存'}
          </button>
        </form>
      </section>

      {monthly.length === 0 && (
        <div className="text-center py-10 text-gray-500">まだ功績データがありません。</div>
      )}

      <div className="space-y-3">
        {monthly.map((item) => (
          <div key={item.month} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-lg font-semibold text-gray-900">
              {item.month.replace('-', '年')}月
            </p>
            <p className="text-xs text-gray-500 mt-1">登録数: {item.items.length}件</p>
            <div className="mt-3 space-y-2">
              {item.items.map((achievement) => (
                <div
                  key={achievement.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{achievement.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{achievement.achievement_date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAchievement(achievement.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                  {achievement.summary && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{achievement.summary}</p>
                  )}
                  {achievement.impact && (
                    <p className="text-sm text-gray-800 mt-2">
                      <span className="font-medium">成果:</span> {achievement.impact}
                    </p>
                  )}
                  {achievement.link_url && (
                    <a
                      href={achievement.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-mirai-700 underline mt-2 inline-block"
                    >
                      関連リンク
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

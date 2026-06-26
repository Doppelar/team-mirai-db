import { useEffect, useState, FormEvent } from 'react'
import SearchBar from '../components/SearchBar'
import TagBadge from '../components/TagBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfigWarning from '../components/ConfigWarning'
import {
  fetchAgenda,
  createAgenda,
  updateAgenda,
  deleteAgenda,
  isSupabaseConfigured,
} from '../lib/supabase'
import type { Agenda } from '../types/database'

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6',
]

const emptyForm = { name: '', color: '#3B82F6', description: '' }

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

export default function AgendaPage() {
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadAgenda = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAgenda()
      setAgenda(data)
    } catch (e) {
      setError(stringifyError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgenda()
  }, [])

  const filtered = agenda.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (item: Agenda) => {
    setEditingId(item.id)
    setForm({ name: item.name, color: item.color, description: item.description })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setSubmitting(true)
    try {
      if (editingId) {
        await updateAgenda(editingId, form)
      } else {
        await createAgenda(form)
      }
      closeForm()
      await loadAgenda()
    } catch (e) {
      console.error('Failed to save agenda', e)
      setError(stringifyError(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`タグ「${name}」を削除しますか？`)) return
    try {
      await deleteAgenda(id)
      await loadAgenda()
    } catch (e) {
      console.error('Failed to delete agenda', e)
      setError(stringifyError(e))
    }
  }

  return (
    <div>
      <ConfigWarning show={!isSupabaseConfigured} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タグ管理</h1>
          <p className="text-sm text-gray-500 mt-1">週報に付けるタグ（議題）を管理します</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center px-4 py-2 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 transition-colors font-medium text-sm shrink-0"
        >
          + タグを追加
        </button>
      </div>

      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="タグ名で検索..." />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? 'タグを編集' : 'タグを追加'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タグ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
                  placeholder="政策、イベント など"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        form.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <TagBadge name={form.name || 'プレビュー'} color={form.color} size="md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500 resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 font-medium disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={loadAgenda} />}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {search ? '検索結果がありません' : 'タグがまだ登録されていません'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <TagBadge name={item.name} color={item.color} size="md" />
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-sm text-mirai-600 hover:text-mirai-800 font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

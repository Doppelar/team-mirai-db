import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfigWarning from '../components/ConfigWarning'
import {
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  isSupabaseConfigured,
} from '../lib/supabase'
import type { Member } from '../types/database'

const emptyForm = {
  name: '',
  role: '',
  bio: '',
  instagram_url: '',
  x_url: '',
  avatar_url: '',
  is_active: true,
}

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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMembers()
      setMembers(data)
    } catch (e) {
      setError(stringifyError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (member: Member) => {
    setEditingId(member.id)
    setForm({
      name: member.name,
      role: member.role,
      bio: member.bio,
      instagram_url: member.instagram_url,
      x_url: member.x_url,
      avatar_url: member.avatar_url,
      is_active: member.is_active,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl === 'string') {
        setForm((prev) => ({ ...prev, avatar_url: dataUrl }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setSubmitting(true)
    try {
      if (editingId) {
        await updateMember(editingId, form)
      } else {
        await createMember(form)
      }
      closeForm()
      await loadMembers()
    } catch (e) {
      console.error('Failed to save member', e)
      setError(stringifyError(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    try {
      await deleteMember(id)
      await loadMembers()
    } catch (e) {
      console.error('Failed to delete member', e)
      setError(stringifyError(e))
    }
  }

  return (
    <div>
      <ConfigWarning show={!isSupabaseConfigured} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">出演者一覧</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center px-4 py-2 bg-mirai-600 text-white rounded-xl hover:bg-mirai-700 transition-colors font-medium text-sm"
        >
          + 出演者を追加
        </button>
      </div>

      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="名前・役割で検索..." />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? '出演者を編集' : '出演者を追加'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">役割</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
                  placeholder="代表、メンバー など"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">プロフィール</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500 resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={form.instagram_url}
                  onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
                  placeholder="https://www.instagram.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X URL
                </label>
                <input
                  type="url"
                  value={form.x_url}
                  onChange={(e) => setForm({ ...form, x_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mirai-500"
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顔写真</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:border file:border-gray-300 file:rounded-lg file:bg-white file:cursor-pointer"
                />
                {form.avatar_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={form.avatar_url}
                      alt="顔写真プレビュー"
                      className="w-14 h-14 rounded-full object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatar_url: '' })}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      画像を削除
                    </button>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-mirai-600 focus:ring-mirai-500"
                />
                有効（週報登録時に選択可能）
              </label>
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
      {error && <ErrorMessage message={error} onRetry={loadMembers} />}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {search ? '検索結果がありません' : '出演者がまだ登録されていません'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((member) => (
            <div
              key={member.id}
              className={`bg-white rounded-xl border p-4 flex gap-3 ${
                member.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={`${member.name}の顔写真`}
                  className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <span className="w-14 h-14 rounded-full bg-mirai-100 flex items-center justify-center text-xl font-bold text-mirai-700 shrink-0">
                  {member.name.charAt(0)}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{member.name}</h2>
                    {member.role && (
                      <p className="text-sm text-gray-500">{member.role}</p>
                    )}
                  </div>
                  {!member.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                      無効
                    </span>
                  )}
                </div>
                {member.bio && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{member.bio}</p>
                )}
                {member.instagram_url && (
                  <a
                    href={member.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-mirai-600 hover:text-mirai-800 mt-1 inline-block"
                  >
                    Instagram
                  </a>
                )}
                {member.x_url && (
                  <a
                    href={member.x_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-sky-600 hover:text-sky-800 mt-1 inline-block ml-3"
                  >
                    X
                  </a>
                )}
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/members/${member.id}`}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    活動ページ
                  </Link>
                  <button
                    onClick={() => openEdit(member)}
                    className="text-sm text-mirai-600 hover:text-mirai-800 font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(member.id, member.name)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

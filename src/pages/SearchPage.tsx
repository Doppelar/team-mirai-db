import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import { appNavItems } from '../lib/navigation'

export default function SearchPage() {
  const [search, setSearch] = useState('')

  const normalized = search.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    if (!normalized) return appNavItems
    return appNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized) ||
        item.to.toLowerCase().includes(normalized)
    )
  }, [normalized])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">検索ページ</h1>
        <p className="text-sm text-gray-600 mt-1">
          アプリの各タブを説明付きで一覧表示しています。キーワードで絞り込めます。
        </p>
      </div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="ページ名・説明・パスで検索..."
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_3fr] text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-3">
          <span>ページ</span>
          <span>説明</span>
        </div>
        {filteredItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="grid grid-cols-[1.4fr_3fr] gap-3 px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.to}</p>
            </div>
            <p className="text-sm text-gray-700">{item.description}</p>
          </Link>
        ))}
        {filteredItems.length === 0 && (
          <div className="px-4 py-10 text-sm text-gray-500 text-center">該当するページがありません</div>
        )}
      </div>
    </div>
  )
}

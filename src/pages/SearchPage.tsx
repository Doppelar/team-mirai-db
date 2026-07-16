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
          アプリの各ページをバナー形式で表示しています。キーワードで絞り込めます。
        </p>
      </div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="ページ名・説明・パスで検索..."
        />
      </div>

      <div className="grid gap-4">
        {filteredItems.map((item, index) => {
          const accents = [
            'from-mirai-600 to-mirai-700',
            'from-sky-600 to-indigo-700',
            'from-emerald-600 to-teal-700',
            'from-fuchsia-600 to-pink-700',
            'from-amber-500 to-orange-600',
          ]
          const accent = accents[index % accents.length]

          return (
            <Link
              key={item.to}
              to={item.to}
              className="group block rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <div className={`bg-gradient-to-r ${accent} px-5 py-4 text-white`}>
                <p className="text-xs tracking-wide opacity-90">アプリページ</p>
                <h2 className="text-lg font-bold mt-1">{item.label}</h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-500">{item.to}</p>
                <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                <p className="mt-3 text-sm text-mirai-700 group-hover:text-mirai-800 font-medium">
                  ページを開く →
                </p>
              </div>
            </Link>
          )
        })}
        {filteredItems.length === 0 && (
          <div className="px-4 py-10 text-sm text-gray-500 text-center bg-white border border-gray-200 rounded-xl">
            該当するページがありません
          </div>
        )}
      </div>
    </div>
  )
}

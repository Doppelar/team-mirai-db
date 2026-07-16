import { Link, Outlet, useLocation } from 'react-router-dom'
import { appNavItems } from '../lib/navigation'

const navItems = appNavItems.filter((item) => item.showInHeader !== false)

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-mirai-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="text-lg sm:text-xl font-bold whitespace-nowrap">
              チームみらい活動アーカイブ
            </Link>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {navItems.map(({ to, label }) => {
              const isActive =
                to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white/20 font-semibold'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-sm text-gray-500">
        チームみらい活動アーカイブ
      </footer>
    </div>
  )
}

import { Bell, BookOpenText, ChartNoAxesCombined, LayoutDashboard, Ticket } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/knowledge-base', label: 'KB Manager', icon: BookOpenText },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
]

const titleByPath = {
  '/dashboard': 'Dashboard Overview',
  '/tickets': 'Tickets',
  '/knowledge-base': 'Knowledge Base',
  '/analytics': 'Analytics',
}

function AppLayout({ children }) {
  const location = useLocation()
  const title =
    location.pathname.startsWith('/tickets/')
      ? 'Ticket Detail'
      : titleByPath[location.pathname] || 'Kutane AI'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <aside className="hidden w-60 border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col">
        <div>
          <h1 className="text-xl font-semibold text-indigo-600">Kutane AI</h1>
          <p className="mt-1 text-xs text-slate-500">Support Triage MVP</p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Signed in as
          <p className="mt-1 font-semibold text-slate-700">Agent</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Kutane / {location.pathname}</p>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>

          <button
            type="button"
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

export default AppLayout

import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-indigo-600">Kutane AI</h3>
            <p className="mt-2 text-sm text-slate-500">Your AI team that never sleeps.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Product</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <Link to="/pricing" className="hover:text-slate-900">Pricing</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <Link to="/privacy" className="hover:text-slate-900">Privacy</Link>
              <Link to="/terms" className="hover:text-slate-900">Terms</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">© 2025 Kutane AI, Inc.</div>
      </div>
    </footer>
  )
}
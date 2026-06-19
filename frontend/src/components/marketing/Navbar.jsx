import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link to="/" className="text-xl font-bold text-indigo-600">NovaMind AI</Link>
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
          <Link to="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Start Free Trial</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-slate-600">☰</button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 border-t px-4 py-3 md:hidden">
          <Link to="/pricing" className="text-sm font-medium">Pricing</Link>
          <Link to="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white">Start Free Trial</Link>
        </div>
      )}
    </nav>
  )
}
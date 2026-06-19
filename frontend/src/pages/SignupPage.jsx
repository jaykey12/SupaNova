import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'https://novamind-api-kfzb.onrender.com'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email and password required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, company_name: company })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Signup failed')
      localStorage.setItem('token', data.token)
      localStorage.setItem('user_id', data.user_id)
      localStorage.setItem('email', data.email)
      toast.success('Account created! Welcome to NovaMind AI')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-3xl font-bold text-slate-900">Create Your NovaMind AI Account</h1>
      <p className="mt-2 text-center text-sm text-slate-500">Start your 14-day free trial. No credit card required.</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <input type="email" placeholder="Work Email" value={email} onChange={e => setEmail(e.target.value)}
          className="rounded-lg border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          className="rounded-lg border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" required minLength={6} />
        <input placeholder="Company Name" value={company} onChange={e => setCompany(e.target.value)}
          className="rounded-lg border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
        <button type="submit" disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Start Free Trial →'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
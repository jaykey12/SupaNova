import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import PageErrorState from '../components/shared/PageErrorState'

const API = import.meta.env.VITE_API_URL || 'https://kutane-api-kfzb.onrender.com'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 49,
    planId: 'starter_monthly',
    desc: 'For small teams (1-5)',
    features: ['AI Ticket Triage', 'Email Channel', '1,000 tickets/mo', '5 team members', '3 KB docs', 'Basic analytics', 'API access'],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 149,
    planId: 'growth_monthly',
    desc: 'For growing teams (5-20)',
    features: ['Everything in Starter', 'Slack Routing', '5,000 tickets/mo', '20 team members', 'Unlimited KB docs', 'Advanced analytics', 'API access'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 399,
    planId: 'enterprise_monthly',
    desc: 'For large teams (20+)',
    features: ['Everything in Growth', 'Unlimited tickets', 'Unlimited team members', 'SSO/SAML', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
  },
]

export default function BillingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [error, setError] = useState(null)

  const userId = localStorage.getItem('user_id')
  const userEmail = localStorage.getItem('email')
  const token = localStorage.getItem('token')

  const loadSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API}/api/v1/billing/subscription/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.status && data.status !== 'none') {
        setSubscription(data)
      }
    } catch {
      // No subscription yet — user is on free plan
    } finally {
      setLoading(false)
    }
  }, [userId, token])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  const handleSubscribe = async (planId) => {
    if (!userId) {
      toast.error('Please sign in first')
      navigate('/login')
      return
    }
    setSubscribing(true)
    try {
      const res = await fetch(`${API}/api/v1/billing/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          user_id: userId,
          email: userEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create subscription')

      // Redirect user to PayPal approval page
      window.location.href = data.approval_url
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubscribing(false)
    }
  }

  const handleCancel = async () => {
    if (!subscription) return
    try {
      const res = await fetch(`${API}/api/v1/billing/cancel/${subscription.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to cancel subscription')
      toast.success('Subscription cancelled')
      setSubscription(null)
    } catch (err) {
      toast.error('Failed to cancel: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return <PageErrorState message={error} onRetry={loadSubscription} />
  }

  if (subscription) {
    const currentPlan = PLANS.find((p) => p.planId === `${subscription.plan_tier}_monthly`) || PLANS[0]
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">Billing & Subscription</h1>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
          <div className="mt-4 rounded-lg bg-indigo-50 p-4">
            <p className="text-xl font-bold text-indigo-700">{currentPlan.name}</p>
            <p className="mt-1 text-sm text-indigo-600">${currentPlan.monthly}/mo</p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              subscription.status === 'active' ? 'bg-green-100 text-green-700' :
              subscription.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {subscription.status === 'active' ? '✅ Active' :
               subscription.status === 'trialing' ? '🚀 Trial' :
               subscription.status === 'approval_pending' ? '⏳ Pending Approval' :
               subscription.status}
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
            {currentPlan.features.map((f) => (
              <li key={f} className="flex items-center gap-2">✅ {f}</li>
            ))}
          </ul>

          <button
            onClick={handleCancel}
            className="mt-6 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Choose a Plan</h1>
      <p className="mt-1 text-sm text-slate-500">Start free, upgrade when you grow.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border p-6 shadow-sm ${
              plan.recommended ? 'border-indigo-300 ring-2 ring-indigo-400' : 'border-slate-200'
            }`}
          >
            {plan.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                Recommended
              </span>
            )}
            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{plan.desc}</p>
            <p className="mt-4">
              <span className="text-4xl font-bold text-slate-900">${plan.monthly}</span>
              <span className="text-sm text-slate-500">/month</span>
            </p>
            <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-600">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">✅ {f}</li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.planId)}
              disabled={subscribing}
              className={`mt-6 block w-full rounded-lg px-4 py-2 text-center text-sm font-semibold disabled:opacity-50 ${
                plan.recommended
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border text-slate-700 hover:bg-slate-50'
              }`}
            >
              {subscribing ? 'Processing...' : userId ? 'Subscribe →' : 'Sign Up Free →'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

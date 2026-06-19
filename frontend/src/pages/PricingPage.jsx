import { useState } from 'react'
import { Link } from 'react-router-dom'

const PLANS = [
  { id: 'starter', name: 'Starter', monthly: 49, annual: 41, annualTotal: 490, desc: 'For small teams (1-5)', features: ['AI Ticket Triage', 'Email Channel', '1,000 tickets/mo', '5 team members', '3 KB docs', 'Basic analytics', 'API access'] },
  { id: 'growth', name: 'Growth', monthly: 149, annual: 125, annualTotal: 1490, desc: 'For growing teams (5-20)', features: ['Everything in Starter', 'Slack Routing', '5,000 tickets/mo', '20 team members', 'Unlimited KB docs', 'Advanced analytics', 'API access'], recommended: true },
  { id: 'enterprise', name: 'Enterprise', monthly: 399, annual: 335, annualTotal: 3990, desc: 'For large teams (20+)', features: ['Everything in Growth', 'Unlimited tickets', 'Unlimited team members', 'SSO/SAML', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <h1 className="text-center text-4xl font-bold text-slate-900">Simple, Transparent Pricing</h1>
      <p className="mt-2 text-center text-slate-500">Start free, upgrade when you grow.</p>

      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border p-1 text-sm">
          <button onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 ${!annual ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Monthly</button>
          <button onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 ${annual ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Annual <span className="text-xs">Save 16%</span></button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`relative rounded-xl border p-6 shadow-sm ${plan.recommended ? 'border-indigo-300 ring-2 ring-indigo-400' : 'border-slate-200'}`}>
            {plan.recommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">Recommended</span>}
            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{plan.desc}</p>
            <p className="mt-4">
              <span className="text-4xl font-bold text-slate-900">${annual ? plan.annual : plan.monthly}</span>
              <span className="text-sm text-slate-500">/month</span>
            </p>
            {annual && <p className="text-xs text-slate-400">Billed ${plan.annualTotal}/year</p>}
            <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-600">
              {plan.features.map((f) => <li key={f} className="flex items-center gap-2">✅ {f}</li>)}
            </ul>
            <Link to="/signup" className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm font-semibold ${plan.recommended ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border text-slate-700 hover:bg-slate-50'}`}>Start Free Trial →</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
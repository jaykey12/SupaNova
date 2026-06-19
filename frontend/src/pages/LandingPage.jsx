import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-20 text-center lg:px-8">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Your AI Team That Never Sleeps</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">Automate support triage, nurture leads, and streamline workflows — from one intelligent platform.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/signup" className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Start Free Trial →</Link>
          <Link to="/pricing" className="rounded-lg border px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">See Pricing</Link>
        </div>
        <p className="mt-3 text-xs text-slate-400">No credit card required · 14-day free trial</p>
      </section>

      <section className="border-t bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Three Ways NovaMind AI Powers Your Business</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { emoji: '💬', title: 'AI Customer Support', desc: 'Resolve 60-70% of tickets automatically with AI triage and KB auto-reply.' },
              { emoji: '📈', title: 'Lead Engagement', desc: 'Increase conversions by 35% with AI-powered lead nurturing and scoring.' },
              { emoji: '⚡', title: 'Workflow Automation', desc: 'Reduce cross-department process time by 40% with AI workflows.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border bg-white p-6 text-center shadow-sm">
                <div className="text-3xl">{item.emoji}</div>
                <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Ready to Transform Your Support?</h2>
          <p className="mt-2 text-slate-500">Get started free. No credit card. No commitment.</p>
          <Link to="/signup" className="mt-6 inline-block rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Start Your Free Trial →</Link>
        </div>
      </section>
    </div>
  )
}
export default function BillingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Billing & Subscription</h1>
      <div className="mt-6 rounded-xl border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
        <p className="mt-2 text-sm text-slate-500">You are on the <strong>Growth</strong> plan ($149/mo).</p>
        <p className="mt-1 text-sm text-green-600">✅ Active</p>
        <button className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel Subscription</button>
      </div>
    </div>
  )
}
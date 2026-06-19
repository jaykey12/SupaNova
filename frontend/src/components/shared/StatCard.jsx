function StatCard({ label, value, icon, trend }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon ? <span className="text-lg">{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {trend ? (
        <p className={`mt-2 text-xs font-medium ${trend.direction === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
          {trend.direction === 'up' ? '▲' : '▼'} {trend.percentage}%
        </p>
      ) : null}
    </article>
  )
}

export default StatCard

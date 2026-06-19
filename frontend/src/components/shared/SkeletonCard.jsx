function SkeletonCard({ lines = 3 }) {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-5 w-1/3 rounded bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`h-3 rounded bg-slate-200 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default SkeletonCard

const STYLE_MAP = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function PriorityBadge({ priority }) {
  const normalized = (priority || 'medium').toLowerCase()
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STYLE_MAP[normalized] || STYLE_MAP.medium}`}>
      {normalized === 'high' ? '🔴' : normalized === 'low' ? '🟢' : '🟡'} {normalized}
    </span>
  )
}

export default PriorityBadge

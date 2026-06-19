const STYLE_MAP = {
  open: 'bg-sky-100 text-sky-700 border-sky-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function StatusBadge({ status }) {
  const normalized = (status || 'open').toLowerCase()

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${STYLE_MAP[normalized] || STYLE_MAP.open}`}>
      {normalized}
    </span>
  )
}

export default StatusBadge

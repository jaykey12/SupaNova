import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getAnalyticsSummary } from '../api/client'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import PageErrorState from '../components/shared/PageErrorState'

const PIE_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#94a3b8']

function AnalyticsPage() {
  const [range, setRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getAnalyticsSummary(range)
      setData(response)
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    loadData()
  }, [loadData])

  const categoryData = useMemo(
    () => Object.entries(data?.by_category || {}).map(([name, value]) => ({ name, value })),
    [data],
  )
  const priorityData = useMemo(
    () => Object.entries(data?.by_priority || {}).map(([name, value]) => ({ name, value })),
    [data],
  )

  const exportCsv = () => {
    if (!data?.ticket_volume?.length) return

    const rows = [['date', 'count', 'auto_replied', 'escalated']]
    data.ticket_volume.forEach((entry) => {
      rows.push([entry.date, entry.count, entry.auto_replied, entry.escalated])
    })

    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `novamind-analytics-${range}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return <PageErrorState message={error} onRetry={loadData} />
  }

  if (!data) {
    return (
      <EmptyState
        title="No analytics yet"
        description="As tickets get processed, analytics and trend data will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="inline-flex rounded-lg border border-slate-200 p-1">
          {['7d', '30d', 'custom'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                range === option ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Export CSV
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Ticket Volume Over Time</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.ticket_volume}>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              <Line type="monotone" dataKey="auto_replied" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="escalated" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">By Category</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">By Priority</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">AI Performance</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Auto Reply Rate</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{data.ai_performance.auto_reply_rate}%</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">AI Accuracy</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{data.ai_performance.ai_accuracy}%</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Escalation Rate</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{data.ai_performance.escalation_rate}%</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Total Processed</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{data.ai_performance.total_processed}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Response Times</h3>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Avg</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{data.response_times.avg_minutes}m</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">P50</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{data.response_times.p50_minutes}m</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">P95</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{data.response_times.p95_minutes}m</dd>
            </div>
          </dl>

          <div className="mt-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.response_times.trend}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="avg_minutes" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  )
}

export default AnalyticsPage

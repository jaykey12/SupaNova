import { useCallback, useEffect, useState } from 'react'
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts'
import { Link } from 'react-router-dom'

import { getDashboardSummary } from '../api/client'
import EmptyState from '../components/shared/EmptyState'
import PageErrorState from '../components/shared/PageErrorState'
import SkeletonCard from '../components/shared/SkeletonCard'
import StatCard from '../components/shared/StatCard'

const PIE_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#94a3b8']

function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getDashboardSummary()
      setData(response)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={2} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  if (error) {
    return <PageErrorState message={error} onRetry={loadData} />
  }

  if (!data || !data.total_tickets) {
    return (
      <EmptyState
        title="No support activity yet"
        description="Ingest your first support email to see ticket analytics and summaries."
        actionLabel="Refresh"
        onAction={loadData}
      />
    )
  }

  const categoryData = Object.entries(data.by_category || {}).map(([name, value]) => ({ name, value }))
  const sentimentData = Object.entries(data.sentiment_breakdown || {}).map(([name, value]) => ({ name, value }))
  const ticketVolume = data.ticket_volume_7d || []

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tickets" value={data.total_tickets} icon="🎫" trend={{ direction: 'up', percentage: 8 }} />
        <StatCard label="Open Tickets" value={data.open_tickets} icon="📭" trend={{ direction: 'down', percentage: 4 }} />
        <StatCard label="Resolved Today" value={data.resolved_today} icon="✅" trend={{ direction: 'up', percentage: 12 }} />
        <StatCard
          label="Avg Response Time"
          value={`${data.avg_response_time_minutes}m`}
          icon="⏱️"
          trend={{ direction: 'down', percentage: 9 }}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">Ticket Volume (Last 7 Days)</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ticketVolume}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

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
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">Sentiment Breakdown</h3>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent Unresolved</h3>
            <Link className="text-xs font-medium text-indigo-600 hover:text-indigo-700" to="/tickets">
              View all
            </Link>
          </div>

          <ul className="mt-4 space-y-3">
            {(data.recent_unresolved || []).slice(0, 5).map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-800">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">Priority: {ticket.priority}</p>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}

export default DashboardPage

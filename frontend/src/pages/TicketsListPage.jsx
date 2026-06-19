import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import PageErrorState from '../components/shared/PageErrorState'
import Pagination from '../components/shared/Pagination'
import PriorityBadge from '../components/shared/PriorityBadge'
import StatusBadge from '../components/shared/StatusBadge'
import { useTickets } from '../context/TicketsContext'

const CATEGORY_OPTIONS = ['', 'billing', 'technical', 'feature_request', 'complaint', 'other']
const STATUS_OPTIONS = ['', 'open', 'pending', 'resolved']
const PRIORITY_OPTIONS = ['', 'high', 'medium', 'low']

function TicketsListPage() {
  const navigate = useNavigate()
  const { state, fetchTickets, setSearch, setFilter, setPage, setSort } = useTickets()
  const [searchInput, setSearchInput] = useState(state.search)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchInput, setSearch])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const nextSortOrder = useMemo(() => {
    return state.sortOrder === 'asc' ? 'desc' : 'asc'
  }, [state.sortOrder])

  if (state.error) {
    return <PageErrorState message={state.error} onRetry={fetchTickets} />
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search tickets..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 placeholder:text-slate-400 focus:ring"
          />

          <select
            value={state.filters.category}
            onChange={(event) => setFilter('category', event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={state.filters.status}
            onChange={(event) => setFilter('status', event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={state.filters.priority}
            onChange={(event) => setFilter('priority', event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSort('created_at', nextSortOrder)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            Sort by date ({state.sortOrder})
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {state.loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : state.tickets.length ? (
                state.tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">{ticket.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{ticket.subject}</p>
                      <p className="text-xs text-slate-500">{ticket.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{ticket.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(ticket.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <EmptyState
                      title="No tickets found"
                      description="Try adjusting filters or ingesting sample support emails to populate this list."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Pagination
        page={state.pagination.page}
        totalPages={state.pagination.totalPages}
        onPageChange={(page) => setPage(page)}
      />
    </div>
  )
}

export default TicketsListPage

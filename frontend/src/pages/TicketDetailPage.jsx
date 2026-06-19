import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { claimTicket, getTicketById, resolveTicket } from '../api/client'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import PageErrorState from '../components/shared/PageErrorState'
import PriorityBadge from '../components/shared/PriorityBadge'
import StatusBadge from '../components/shared/StatusBadge'
import { useTickets } from '../context/TicketsContext'

function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { upsertTicket } = useTickets()

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')

  const loadTicket = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getTicketById(id)
      setTicket(response)
    } catch (err) {
      setError(err.message || 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadTicket()
  }, [loadTicket])

  const handleClaim = async () => {
    setClaiming(true)

    try {
      const updated = await claimTicket(ticket.id, 'Support Agent')
      setTicket(updated)
      upsertTicket(updated)
      toast.success('Ticket claimed successfully')
    } catch {
      toast.error('Failed to claim ticket')
    } finally {
      setClaiming(false)
    }
  }

  const handleResolve = async () => {
    setResolving(true)

    try {
      await resolveTicket(ticket.id, 'Resolved from dashboard')
      const updated = {
        ...ticket,
        status: 'resolved',
      }
      setTicket(updated)
      upsertTicket(updated)
      toast.success('Ticket resolved')
    } catch {
      toast.error('Failed to resolve ticket')
    } finally {
      setResolving(false)
    }
  }

  const handleReply = () => {
    if (!replyText.trim()) return

    const nextConversation = [
      ...(ticket.conversation || []),
      {
        role: 'agent',
        content: replyText,
        timestamp: new Date().toISOString(),
        agentName: 'Support Agent',
      },
    ]

    const updated = {
      ...ticket,
      conversation: nextConversation,
      status: ticket.status === 'open' ? 'pending' : ticket.status,
    }

    setTicket(updated)
    upsertTicket(updated)
    setReplyText('')
    toast.success('Reply added locally (MVP mode)')
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return

    const updated = {
      ...ticket,
      notes: [
        {
          author: 'Support Agent',
          content: noteText,
          created_at: new Date().toISOString(),
        },
        ...(ticket.notes || []),
      ],
    }

    setTicket(updated)
    setNoteText('')
    toast.success('Note added')
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return <PageErrorState message={error} onRetry={loadTicket} />
  }

  if (!ticket) {
    return (
      <EmptyState
        title="Ticket not found"
        description="This ticket might have been deleted or does not exist."
        actionLabel="Back to tickets"
        onAction={() => navigate('/tickets')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Link to="/tickets" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        ← Back to tickets
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Ticket #{ticket.id} — {ticket.subject}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Customer: {ticket.customer_name} · {ticket.customer_email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-700">AI Classification</h4>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Intent</dt>
              <dd className="font-medium text-slate-800">{ticket.classification.intent}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Sentiment</dt>
              <dd className="font-medium text-slate-800">{ticket.classification.sentiment}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Confidence</dt>
              <dd className="font-medium text-slate-800">
                {(Number(ticket.classification.confidence || 0) * 100).toFixed(0)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Suggested Action</dt>
              <dd className="font-medium text-slate-800">{ticket.classification.suggested_action}</dd>
            </div>
          </dl>

          {ticket.classification.knowledge_match ? (
            <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">
              <p className="font-semibold">Knowledge Match</p>
              <p className="mt-1">{ticket.classification.knowledge_match.title}</p>
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-700">Conversation Thread</h4>
          <div className="mt-4 space-y-3">
            {(ticket.conversation || []).map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'agent'
                    ? 'ml-auto bg-emerald-100 text-emerald-900'
                    : message.role === 'ai'
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{message.role}</p>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={claiming || ticket.status === 'pending'}
            onClick={handleClaim}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claiming ? 'Claiming...' : 'Claim Ticket'}
          </button>
          <button
            type="button"
            disabled={resolving || ticket.status === 'resolved'}
            onClick={handleResolve}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resolving ? 'Resolving...' : 'Resolve'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder="Reply to customer..."
            className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
          <button
            type="button"
            onClick={handleReply}
            className="h-fit rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium"
          >
            Add Reply
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-700">Internal Notes</h4>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add internal note..."
            className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
          <button
            type="button"
            onClick={handleAddNote}
            className="h-fit rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium"
          >
            Save Note
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {(ticket.notes || []).map((note, index) => (
            <li key={`${note.created_at}-${index}`} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-800">{note.author}</p>
              <p className="mt-1 text-slate-600">{note.content}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(note.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default TicketDetailPage

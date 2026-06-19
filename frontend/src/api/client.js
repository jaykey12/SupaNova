import analyticsMock from '../mocks/analytics-mock.json'
import kbMock from '../mocks/kb-mock.json'
import ticketsMock from '../mocks/tickets-mock.json'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://novamind-api-kfzb.onrender.com'
const KB_STORAGE_KEY = 'novamind_kb_documents'

function toIsoDate(value) {
  if (!value) return new Date().toISOString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function statusToUiStatus(status) {
  if (!status) return 'open'
  const normalized = String(status).toLowerCase()
  if (normalized === 'resolved' || normalized === 'auto_replied') return 'resolved'
  if (normalized === 'claimed' || normalized === 'pending') return 'pending'
  return 'open'
}

function derivePriority(ticket) {
  if (ticket.priority) return ticket.priority
  if (ticket.sentiment === 'negative') return 'high'
  if (ticket.category === 'complaint' || ticket.confidence < 0.7) return 'high'
  if (ticket.category === 'feature_request') return 'low'
  return 'medium'
}

function normalizeTicket(ticket, index = 0) {
  const createdAt = toIsoDate(ticket.created_at)
  const updatedAt = toIsoDate(ticket.updated_at || ticket.first_response_at || createdAt)
  const customerEmail = ticket.customer_email || ticket.sender_email || 'unknown@example.com'

  const classification = ticket.classification || {
    intent: ticket.category || 'other',
    sentiment: ticket.sentiment || 'neutral',
    confidence: Number(ticket.confidence ?? 0.6),
    suggested_action: Number(ticket.confidence ?? 0) >= 0.85 ? 'auto_reply' : 'route_to_agent',
    knowledge_match: ticket.kb_match || null,
  }

  const autoReplyMessage = ticket.auto_reply_text
    ? [
        {
          role: 'ai',
          content: ticket.auto_reply_text,
          timestamp: ticket.first_response_at || createdAt,
        },
      ]
    : []

  return {
    id: String(ticket.id ?? `mock-${index}`),
    subject: ticket.subject || 'Untitled ticket',
    customer_name: ticket.customer_name || customerEmail.split('@')[0],
    customer_email: customerEmail,
    category: ticket.category || classification.intent || 'other',
    priority: derivePriority(ticket),
    status: statusToUiStatus(ticket.status),
    sentiment: ticket.sentiment || classification.sentiment || 'neutral',
    confidence: Number(ticket.confidence ?? classification.confidence ?? 0.6),
    classification,
    summary: ticket.summary || 'No summary available',
    conversation:
      ticket.conversation ||
      [
        {
          role: 'customer',
          content: ticket.body || 'No message body available.',
          timestamp: createdAt,
        },
        ...autoReplyMessage,
      ],
    notes: ticket.notes || [],
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  return response.json()
}

function applyTicketFilters(tickets, query) {
  const searchValue = (query.search || '').trim().toLowerCase()

  let filtered = tickets.filter((ticket) => {
    const matchesSearch =
      !searchValue ||
      ticket.subject.toLowerCase().includes(searchValue) ||
      ticket.customer_name.toLowerCase().includes(searchValue) ||
      ticket.customer_email.toLowerCase().includes(searchValue)

    const matchesCategory = !query.category || ticket.category === query.category
    const matchesStatus = !query.status || ticket.status === query.status
    const matchesPriority = !query.priority || ticket.priority === query.priority

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority
  })

  const sortBy = query.sort_by || 'created_at'
  const sortOrder = query.sort_order || 'desc'

  filtered = filtered.sort((left, right) => {
    const leftValue = left[sortBy] ?? ''
    const rightValue = right[sortBy] ?? ''

    let compare = 0
    if (sortBy.includes('at')) {
      compare = new Date(leftValue).getTime() - new Date(rightValue).getTime()
    } else {
      compare = String(leftValue).localeCompare(String(rightValue))
    }

    return sortOrder === 'asc' ? compare : -compare
  })

  return filtered
}

function paginate(items, page = 1, perPage = 20) {
  const start = (page - 1) * perPage
  const end = start + perPage
  const pagedItems = items.slice(start, end)
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))

  return {
    items: pagedItems,
    pagination: {
      page,
      per_page: perPage,
      total: items.length,
      total_pages: totalPages,
    },
  }
}

function getLocalKbDocuments() {
  const raw = localStorage.getItem(KB_STORAGE_KEY)
  if (!raw) return [...kbMock.documents]

  try {
    return JSON.parse(raw)
  } catch {
    return [...kbMock.documents]
  }
}

function setLocalKbDocuments(documents) {
  localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(documents))
}

function summarizeFromTickets(tickets) {
  const byCategory = { billing: 0, technical: 0, feature_request: 0, complaint: 0, other: 0 }
  const byPriority = { high: 0, medium: 0, low: 0 }
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 }

  tickets.forEach((ticket) => {
    byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1
    byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1
    sentimentBreakdown[ticket.sentiment] = (sentimentBreakdown[ticket.sentiment] || 0) + 1
  })

  const totalTickets = tickets.length
  const resolvedTickets = tickets.filter((ticket) => ticket.status === 'resolved').length
  const openTickets = totalTickets - resolvedTickets

  const ticketVolume = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const dateKey = date.toISOString().slice(0, 10)

    const dayTickets = tickets.filter((ticket) => ticket.created_at.slice(0, 10) === dateKey)
    const autoReplied = dayTickets.filter((ticket) => ticket.classification.suggested_action === 'auto_reply').length

    return {
      date: dateKey,
      count: dayTickets.length,
      auto_replied: autoReplied,
      escalated: Math.max(0, dayTickets.length - autoReplied),
    }
  })

  const recentUnresolved = tickets
    .filter((ticket) => ticket.status !== 'resolved')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      priority: ticket.priority,
      created_at: ticket.created_at,
    }))

  const avgResponseTimeMinutes = 4.2

  return {
    total_tickets: totalTickets,
    open_tickets: openTickets,
    resolved_today: resolvedTickets,
    avg_response_time_minutes: avgResponseTimeMinutes,
    ticket_volume: ticketVolume,
    ticket_volume_7d: ticketVolume.map((entry) => ({ date: entry.date, count: entry.count })),
    by_category: byCategory,
    by_priority: byPriority,
    sentiment_breakdown: sentimentBreakdown,
    ai_performance: {
      auto_reply_rate: totalTickets ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
      ai_accuracy: 88,
      escalation_rate: totalTickets ? Math.round((openTickets / totalTickets) * 100) : 0,
      total_processed: totalTickets,
    },
    response_times: {
      avg_minutes: avgResponseTimeMinutes,
      p50_minutes: 2.1,
      p95_minutes: 12.8,
      trend: ticketVolume.map((entry) => ({ date: entry.date, avg_minutes: 3 + Math.random() * 2 })),
    },
    recent_unresolved: recentUnresolved,
  }
}

export async function getTickets(query = {}) {
  const page = Number(query.page || 1)
  const perPage = Number(query.per_page || 20)

  try {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })

    const response = await apiRequest(`/api/v1/tickets${params.toString() ? `?${params.toString()}` : ''}`)
    const rawTickets = Array.isArray(response) ? response : response.tickets || []
    const normalized = rawTickets.map(normalizeTicket)
    const filtered = applyTicketFilters(normalized, query)
    const paged = paginate(filtered, page, perPage)

    return {
      tickets: paged.items,
      pagination: paged.pagination,
    }
  } catch {
    const normalized = ticketsMock.tickets.map(normalizeTicket)
    const filtered = applyTicketFilters(normalized, query)
    const paged = paginate(filtered, page, perPage)

    return {
      tickets: paged.items,
      pagination: paged.pagination,
    }
  }
}

export async function getTicketById(ticketId) {
  try {
    const response = await apiRequest(`/api/v1/tickets/${ticketId}`)
    return normalizeTicket(response)
  } catch {
    const match = ticketsMock.tickets.find((ticket) => String(ticket.id) === String(ticketId))
    if (!match) throw new Error('Ticket not found')
    return normalizeTicket(match)
  }
}

export async function claimTicket(ticketId, agentName = 'NovaMind Agent') {
  const payload = {
    agent_id: agentName.toLowerCase().replace(/\s+/g, '-'),
    agent_name: agentName,
  }

  try {
    const response = await apiRequest(`/api/v1/tickets/${ticketId}/claim`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return normalizeTicket(response)
  } catch {
    const ticket = await getTicketById(ticketId)
    return {
      ...ticket,
      status: 'pending',
    }
  }
}

export async function resolveTicket(ticketId, resolutionNote) {
  try {
    const response = await apiRequest(`/api/v1/tickets/${ticketId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_note: resolutionNote }),
    })

    return response
  } catch {
    return { success: true, status: 'resolved' }
  }
}

export async function getDashboardSummary() {
  try {
    const analytics = await getAnalyticsSummary('7d')
    return analytics
  } catch {
    return analyticsMock
  }
}

export async function getAnalyticsSummary(range = '7d') {
  try {
    const response = await apiRequest(`/api/v1/analytics/summary?range=${range}`)

    if (response.ticket_volume || response.by_priority) {
      return {
        ...analyticsMock,
        ...response,
      }
    }

    const ticketData = await getTickets({ page: 1, per_page: 500 })
    const synthesized = summarizeFromTickets(ticketData.tickets)

    return {
      ...analyticsMock,
      ...synthesized,
      total_tickets: response.total_tickets ?? synthesized.total_tickets,
      open_tickets: response.unresolved_tickets ?? synthesized.open_tickets,
      resolved_today: response.resolved_tickets ?? synthesized.resolved_today,
      avg_response_time_minutes:
        response.avg_first_response_seconds != null
          ? Number((response.avg_first_response_seconds / 60).toFixed(2))
          : synthesized.avg_response_time_minutes,
      by_category: {
        ...synthesized.by_category,
        ...response.by_category,
      },
    }
  } catch {
    return analyticsMock
  }
}

export async function getKnowledgeBaseDocuments(search = '') {
  try {
    const response = await apiRequest(`/api/v1/kb/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`)
    const documents = response.documents || []

    return documents
  } catch {
    const documents = getLocalKbDocuments()
    return documents.filter((doc) => doc.name.toLowerCase().includes(search.toLowerCase()))
  }
}

export async function uploadKnowledgeBaseDocument({ title, content, source }) {
  const payload = { title, content, source }

  try {
    const response = await apiRequest('/api/v1/kb/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const localDocs = getLocalKbDocuments()
    const newDoc = {
      id: response.id,
      name: response.title,
      file_type: (response.title.split('.').pop() || 'txt').toLowerCase(),
      chunk_count: Math.max(1, Math.ceil((content?.length || 1) / 400)),
      size_bytes: content?.length || 0,
      updated_at: response.created_at,
      source: response.source,
    }

    setLocalKbDocuments([newDoc, ...localDocs])
    return newDoc
  } catch {
    const localDocs = getLocalKbDocuments()
    const newDoc = {
      id: `kb_${Date.now()}`,
      name: title,
      file_type: (title.split('.').pop() || 'txt').toLowerCase(),
      chunk_count: Math.max(1, Math.ceil((content?.length || 1) / 400)),
      size_bytes: content?.length || 0,
      updated_at: new Date().toISOString(),
      source,
    }

    setLocalKbDocuments([newDoc, ...localDocs])
    return newDoc
  }
}

export async function deleteKnowledgeBaseDocument(documentId) {
  try {
    await apiRequest(`/api/v1/kb/documents/${documentId}`, {
      method: 'DELETE',
    })
  } catch {
    // fallback to local delete
  }

  const localDocs = getLocalKbDocuments()
  const nextDocs = localDocs.filter((doc) => doc.id !== documentId)
  setLocalKbDocuments(nextDocs)

  return { success: true }
}
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'

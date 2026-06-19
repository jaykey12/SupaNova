import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'

import { getTickets } from '../api/client'

const TicketsContext = createContext(null)

const initialState = {
  tickets: [],
  loading: true,
  error: null,
  search: '',
  filters: {
    category: '',
    status: '',
    priority: '',
  },
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 1,
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
}

function ticketsReducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        loading: true,
        error: null,
      }

    case 'LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        error: null,
        tickets: action.payload.tickets,
        pagination: {
          ...state.pagination,
          page: action.payload.pagination.page,
          perPage: action.payload.pagination.per_page,
          total: action.payload.pagination.total,
          totalPages: action.payload.pagination.total_pages,
        },
      }

    case 'LOAD_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      }

    case 'SET_SEARCH':
      return {
        ...state,
        search: action.payload,
        pagination: {
          ...state.pagination,
          page: 1,
        },
      }

    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
        pagination: {
          ...state.pagination,
          page: 1,
        },
      }

    case 'SET_PAGE':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          page: action.payload,
        },
      }

    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
      }

    case 'UPSERT_TICKET': {
      const nextTickets = state.tickets.map((ticket) =>
        ticket.id === action.payload.id ? action.payload : ticket,
      )

      return {
        ...state,
        tickets: nextTickets,
      }
    }

    default:
      return state
  }
}

export function TicketsProvider({ children }) {
  const [state, dispatch] = useReducer(ticketsReducer, initialState)

  const fetchTickets = useCallback(async () => {
    dispatch({ type: 'LOAD_START' })

    try {
      const response = await getTickets({
        search: state.search,
        category: state.filters.category,
        status: state.filters.status,
        priority: state.filters.priority,
        page: state.pagination.page,
        per_page: state.pagination.perPage,
        sort_by: state.sortBy,
        sort_order: state.sortOrder,
      })

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: {
          tickets: response.tickets,
          pagination: response.pagination,
        },
      })
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error.message || 'Failed to load tickets',
      })
    }
  }, [
    state.search,
    state.filters.category,
    state.filters.status,
    state.filters.priority,
    state.pagination.page,
    state.pagination.perPage,
    state.sortBy,
    state.sortOrder,
  ])

  const setSearch = useCallback((value) => {
    dispatch({ type: 'SET_SEARCH', payload: value })
  }, [])

  const setFilter = useCallback((key, value) => {
    dispatch({ type: 'SET_FILTER', payload: { key, value } })
  }, [])

  const setPage = useCallback((value) => {
    dispatch({ type: 'SET_PAGE', payload: value })
  }, [])

  const setSort = useCallback((sortBy, sortOrder) => {
    dispatch({ type: 'SET_SORT', payload: { sortBy, sortOrder } })
  }, [])

  const upsertTicket = useCallback((ticket) => {
    dispatch({ type: 'UPSERT_TICKET', payload: ticket })
  }, [])

  const value = useMemo(
    () => ({
      state,
      fetchTickets,
      setSearch,
      setFilter,
      setPage,
      setSort,
      upsertTicket,
    }),
    [state, fetchTickets, setSearch, setFilter, setPage, setSort, upsertTicket],
  )

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
}

export function useTickets() {
  const context = useContext(TicketsContext)
  if (!context) {
    throw new Error('useTickets must be used within TicketsProvider')
  }
  return context
}

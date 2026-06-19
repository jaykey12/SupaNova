import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

import {
  deleteKnowledgeBaseDocument,
  getKnowledgeBaseDocuments,
  uploadKnowledgeBaseDocument,
} from '../api/client'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import PageErrorState from '../components/shared/PageErrorState'

function fileTypeLabel(name) {
  return (name?.split('.').pop() || 'txt').toLowerCase()
}

function KnowledgeBasePage() {
  const fileInputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getKnowledgeBaseDocuments(searchQuery)
      setDocuments(response)
    } catch (err) {
      setError(err.message || 'Failed to load knowledge base documents')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [documents, searchQuery])

  const processFile = async (file) => {
    if (!file) return
    setUploading(true)

    try {
      const content = await file.text()
      const uploaded = await uploadKnowledgeBaseDocument({
        title: file.name,
        content,
        source: `upload://${file.name}`,
      })

      setDocuments((current) => [uploaded, ...current])
      toast.success('Document uploaded')
    } catch {
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId) => {
    try {
      await deleteKnowledgeBaseDocument(documentId)
      setDocuments((current) => current.filter((doc) => doc.id !== documentId))
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  if (error) {
    return <PageErrorState message={error} onRetry={loadDocuments} />
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800">Knowledge Base Upload</h3>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-6 py-10 text-center transition hover:bg-indigo-100"
        >
          <p className="text-sm font-semibold text-indigo-700">Drag & drop files here, or click to upload</p>
          <p className="mt-1 text-xs text-indigo-600">Supported: .txt, .md, .csv, .pdf</p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => processFile(event.target.files?.[0])}
        />

        {uploading ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <LoadingSpinner size="sm" />
            Uploading document...
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 placeholder:text-slate-400 focus:ring"
          />
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            onClick={loadDocuments}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">
            <LoadingSpinner />
          </div>
        ) : filteredDocuments.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Chunks</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">📄 {doc.name}</td>
                    <td className="px-4 py-3 uppercase text-slate-500">{doc.file_type || fileTypeLabel(doc.name)}</td>
                    <td className="px-4 py-3">{doc.chunk_count || 1}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(doc.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No documents yet"
            description="Upload your first knowledge base document to help the AI answer support questions."
          />
        )}
      </section>
    </div>
  )
}

export default KnowledgeBasePage

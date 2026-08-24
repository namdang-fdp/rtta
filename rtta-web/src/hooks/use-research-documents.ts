"use client"

import { useCallback, useEffect, useState } from "react"

import { deleteDocument, listDocuments, uploadDocument } from "@/lib/api/documents"
import type { ResearchDocumentDto } from "@/types/api"

export function useResearchDocuments(meetingId: string | null) {
  const [documents, setDocuments] = useState<ResearchDocumentDto[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!meetingId) return
    setDocuments(await listDocuments(meetingId, signal))
  }, [meetingId])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setDocuments([])
      setError(null)
      if (!meetingId) return
      setLoading(true)
      try { await load(controller.signal) }
      catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setError(caught instanceof Error ? caught.message : "Research documents are unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void initialLoad()
    return () => controller.abort()
  }, [load, meetingId])

  useEffect(() => {
    if (!meetingId || !documents.some((document) => document.status === "UPLOADED" || document.status === "PROCESSING")) return
    const timer = setInterval(() => void load().catch(() => undefined), 2_000)
    return () => clearInterval(timer)
  }, [documents, load, meetingId])

  const upload = useCallback(async (file: File) => {
    if (!meetingId || uploading) return false
    setUploading(true)
    setError(null)
    try {
      const saved = await uploadDocument(meetingId, file)
      setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The research document could not be uploaded.")
      return false
    } finally {
      setUploading(false)
    }
  }, [meetingId, uploading])

  const remove = useCallback(async (documentId: string) => {
    if (!meetingId || deletingId) return
    setDeletingId(documentId)
    setError(null)
    try {
      await deleteDocument(meetingId, documentId)
      setDocuments((current) => current.filter((document) => document.id !== documentId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The research document could not be removed.")
    } finally {
      setDeletingId(null)
    }
  }, [deletingId, meetingId])

  return { documents, loading, uploading, deletingId, error, upload, remove, clearError: () => setError(null) }
}

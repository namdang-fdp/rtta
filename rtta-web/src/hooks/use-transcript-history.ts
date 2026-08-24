"use client"

import { useCallback, useEffect, useState } from "react"

import { useMeetingSelection } from "@/hooks/use-meeting-selection"
import { getTranscript } from "@/lib/api/meetings"
import type { TranscriptUtteranceDto } from "@/types/api"

const PAGE_SIZE = 100

export function useTranscriptHistory(requestedMeetingId: string | undefined, query: string) {
  const selection = useMeetingSelection(requestedMeetingId)
  const [utterances, setUtterances] = useState<TranscriptUtteranceDto[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTranscript() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      if (!selection.resolvedMeetingId) {
        setLoadingTranscript(false)
        setUtterances([])
        return
      }
      setLoadingTranscript(true)
      setError(null)
      try {
        const result = await getTranscript(selection.resolvedMeetingId, {
          page: 0,
          size: PAGE_SIZE,
          query,
          signal: controller.signal,
        })
        setUtterances(result.items)
        setPage(result.page)
        setTotalPages(result.totalPages)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setUtterances([])
        setError(caught instanceof Error ? caught.message : "Transcript history is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoadingTranscript(false)
      }
    }

    void loadTranscript()
    return () => controller.abort()
  }, [query, selection.resolvedMeetingId])

  const loadMore = useCallback(async () => {
    if (!selection.resolvedMeetingId || loadingMore || page + 1 >= totalPages) return
    setLoadingMore(true)
    setError(null)
    try {
      const result = await getTranscript(selection.resolvedMeetingId, {
        page: page + 1,
        size: PAGE_SIZE,
        query,
      })
      setUtterances((current) => [...current, ...result.items])
      setPage(result.page)
      setTotalPages(result.totalPages)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "More transcript history is unavailable.")
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, page, query, selection.resolvedMeetingId, totalPages])

  return {
    meeting: selection.meeting,
    resolvedMeetingId: selection.resolvedMeetingId,
    utterances,
    loading: selection.loading || loadingTranscript,
    loadingMore,
    hasMore: page + 1 < totalPages,
    error: selection.error ?? error,
    loadMore,
  }
}

"use client"

import { useCallback, useEffect, useState } from "react"

import { getMeeting, getTranscript, listMeetings } from "@/lib/api/meetings"
import type { MeetingDto, TranscriptUtteranceDto } from "@/types/api"

const PAGE_SIZE = 100

export function useTranscriptHistory(requestedMeetingId: string | undefined, query: string) {
  const [meeting, setMeeting] = useState<MeetingDto | null>(null)
  const [resolvedMeetingId, setResolvedMeetingId] = useState<string | null>(null)
  const [utterances, setUtterances] = useState<TranscriptUtteranceDto[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loadingMeeting, setLoadingMeeting] = useState(true)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadMeeting() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setLoadingMeeting(true)
      setError(null)
      try {
        const id = requestedMeetingId ?? (await listMeetings({ size: 1, signal: controller.signal })).items[0]?.id
        if (!id) {
          setMeeting(null)
          setResolvedMeetingId(null)
          setUtterances([])
          return
        }
        const loadedMeeting = await getMeeting(id, controller.signal)
        setMeeting(loadedMeeting)
        setResolvedMeetingId(id)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setMeeting(null)
        setResolvedMeetingId(null)
        setError(caught instanceof Error ? caught.message : "Meeting history is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoadingMeeting(false)
      }
    }

    void loadMeeting()
    return () => controller.abort()
  }, [requestedMeetingId])

  useEffect(() => {
    const controller = new AbortController()

    async function loadTranscript() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      if (!resolvedMeetingId) {
        setLoadingTranscript(false)
        return
      }
      setLoadingTranscript(true)
      setError(null)
      try {
        const result = await getTranscript(resolvedMeetingId, {
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
  }, [query, resolvedMeetingId])

  const loadMore = useCallback(async () => {
    if (!resolvedMeetingId || loadingMore || page + 1 >= totalPages) return
    setLoadingMore(true)
    setError(null)
    try {
      const result = await getTranscript(resolvedMeetingId, {
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
  }, [loadingMore, page, query, resolvedMeetingId, totalPages])

  return {
    meeting,
    resolvedMeetingId,
    utterances,
    loading: loadingMeeting || loadingTranscript,
    loadingMore,
    hasMore: page + 1 < totalPages,
    error,
    loadMore,
  }
}

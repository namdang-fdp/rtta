"use client"

import { useCallback, useEffect, useState } from "react"

import { generateMeetingSummary, getMeetingSummary } from "@/lib/api/summaries"
import type { MeetingSummaryDto } from "@/types/api"

export function useMeetingSummary(meetingId: string | null) {
  const [summary, setSummary] = useState<MeetingSummaryDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setSummary(null)
      setError(null)
      if (!meetingId) return
      setLoading(true)
      try {
        setSummary(await getMeetingSummary(meetingId, controller.signal))
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setError(caught instanceof Error ? caught.message : "The meeting summary is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [meetingId])

  const generate = useCallback(async () => {
    if (!meetingId || generating) return
    setGenerating(true)
    setError(null)
    try {
      setSummary(await generateMeetingSummary(meetingId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The summary could not be generated.")
    } finally {
      setGenerating(false)
    }
  }, [generating, meetingId])

  return { summary, loading, generating, error, generate, clearError: () => setError(null) }
}

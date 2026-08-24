"use client"

import { useEffect, useState } from "react"

import { getMeeting, listMeetings } from "@/lib/api/meetings"
import type { MeetingDto } from "@/types/api"

export function useMeetingSelection(requestedMeetingId?: string) {
  const [meeting, setMeeting] = useState<MeetingDto | null>(null)
  const [resolvedMeetingId, setResolvedMeetingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setLoading(true)
      setError(null)
      try {
        const id = requestedMeetingId
          ?? (await listMeetings({ size: 1, signal: controller.signal })).items[0]?.id
        if (!id) {
          setMeeting(null)
          setResolvedMeetingId(null)
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
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [requestedMeetingId])

  return { meeting, resolvedMeetingId, loading, error }
}

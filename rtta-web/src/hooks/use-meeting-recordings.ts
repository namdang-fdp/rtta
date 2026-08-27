"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { listRecordings, startRecording, stopRecording } from "@/lib/api/recordings"
import type { RecordingDto } from "@/types/api"

export function useMeetingRecordings(meetingId: string | null) {
  const [recordings, setRecordings] = useState<RecordingDto[]>([])
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!meetingId) return
    const loaded = await listRecordings(meetingId, signal)
    setRecordings(loaded)
  }, [meetingId])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setRecordings([])
      setError(null)
      if (!meetingId) return
      setLoading(true)
      try {
        await load(controller.signal)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setError("Không thể tải bản ghi âm. Vui lòng thử lại.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void initialLoad()
    return () => controller.abort()
  }, [load, meetingId])

  const activeRecording = useMemo(
    () => recordings.find((recording) => recording.status === "RECORDING") ?? null,
    [recordings],
  )
  const latestReady = useMemo(
    () => recordings.find((recording) => recording.status === "READY") ?? null,
    [recordings],
  )

  useEffect(() => {
    if (!meetingId || !recordings.some((recording) => recording.status === "UPLOADING")) return
    const timer = setInterval(() => {
      void load().catch(() => undefined)
    }, 2_000)
    return () => clearInterval(timer)
  }, [load, meetingId, recordings])

  const start = useCallback(async () => {
    if (!meetingId || pending || activeRecording) return
    setPending(true)
    setError(null)
    try {
      const recording = await startRecording(meetingId)
      setRecordings((current) => [recording, ...current])
    } catch {
      setError("Không thể bắt đầu ghi âm. Vui lòng thử lại.")
    } finally {
      setPending(false)
    }
  }, [activeRecording, meetingId, pending])

  const stop = useCallback(async () => {
    if (!meetingId || !activeRecording || pending) return
    setPending(true)
    setError(null)
    try {
      const updated = await stopRecording(meetingId, activeRecording.id)
      setRecordings((current) => current.map((recording) => recording.id === updated.id ? updated : recording))
    } catch {
      setError("Không thể kết thúc ghi âm đúng cách. Vui lòng thử lại.")
    } finally {
      setPending(false)
    }
  }, [activeRecording, meetingId, pending])

  return { recordings, activeRecording, latestReady, loading, pending, error, start, stop, clearError: () => setError(null) }
}

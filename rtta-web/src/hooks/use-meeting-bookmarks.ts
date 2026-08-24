"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { createBookmark, deleteBookmark, listBookmarks } from "@/lib/api/bookmarks"
import type { BookmarkDto } from "@/types/api"

export interface BookmarkTarget {
  id: string
  offsetMs: number
}

interface BookmarkState {
  meetingId: string | null
  byUtteranceId: Record<string, BookmarkDto>
  error: string | null
}

const EMPTY_BOOKMARKS: Record<string, BookmarkDto> = {}

export function useMeetingBookmarks(meetingId: string | null) {
  const [state, setState] = useState<BookmarkState>({
    meetingId: null,
    byUtteranceId: {},
    error: null,
  })
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setPendingIds(new Set())
      if (!meetingId) {
        setState({ meetingId: null, byUtteranceId: {}, error: null })
        return
      }
      try {
        const bookmarks = await listBookmarks(meetingId, controller.signal)
        if (controller.signal.aborted) return
        const byUtteranceId = Object.fromEntries(
          bookmarks
            .filter((bookmark): bookmark is BookmarkDto & { utteranceId: string } => Boolean(bookmark.utteranceId))
            .map((bookmark) => [bookmark.utteranceId, bookmark]),
        )
        setState({ meetingId, byUtteranceId, error: null })
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setState({
          meetingId,
          byUtteranceId: {},
          error: caught instanceof Error ? caught.message : "Bookmarks are unavailable.",
        })
      }
    }

    void load()
    return () => controller.abort()
  }, [meetingId])

  const currentBookmarks = state.meetingId === meetingId ? state.byUtteranceId : EMPTY_BOOKMARKS
  const bookmarkedIds = useMemo(() => new Set(Object.keys(currentBookmarks)), [currentBookmarks])

  const toggle = useCallback(async (target: BookmarkTarget) => {
    if (!meetingId) {
      setState((current) => ({
        ...current,
        error: "This meeting is not stored yet, so the bookmark could not be saved.",
      }))
      return
    }
    if (pendingIds.has(target.id)) return

    const existing = currentBookmarks[target.id]
    setPendingIds((current) => new Set(current).add(target.id))
    setState((current) => ({ ...current, error: null }))

    if (existing) {
      setState((current) => {
        const next = { ...current.byUtteranceId }
        delete next[target.id]
        return { meetingId, byUtteranceId: next, error: null }
      })
      try {
        await deleteBookmark(meetingId, existing.id)
      } catch (caught) {
        setState((current) => current.meetingId === meetingId ? ({
          meetingId,
          byUtteranceId: { ...current.byUtteranceId, [target.id]: existing },
          error: caught instanceof Error ? caught.message : "The bookmark could not be removed.",
        }) : current)
      } finally {
        setPendingIds((current) => {
          const next = new Set(current)
          next.delete(target.id)
          return next
        })
      }
      return
    }

    const optimistic: BookmarkDto = {
      id: `optimistic:${target.id}`,
      meetingId,
      utteranceId: target.id,
      offsetMs: target.offsetMs,
      label: null,
      sourceText: null,
      translatedText: null,
      createdAt: new Date().toISOString(),
      metadata: null,
    }
    setState((current) => ({
      meetingId,
      byUtteranceId: { ...current.byUtteranceId, [target.id]: optimistic },
      error: null,
    }))
    try {
      const saved = await createBookmark(meetingId, {
        utteranceId: target.id,
        offsetMs: target.offsetMs,
      })
      setState((current) => current.meetingId === meetingId ? ({
        meetingId,
        byUtteranceId: { ...current.byUtteranceId, [target.id]: saved },
        error: null,
      }) : current)
    } catch (caught) {
      setState((current) => {
        const next = { ...current.byUtteranceId }
        delete next[target.id]
        return current.meetingId === meetingId ? {
          meetingId,
          byUtteranceId: next,
          error: caught instanceof Error ? caught.message : "The bookmark could not be saved.",
        } : current
      })
    } finally {
      setPendingIds((current) => {
        const next = new Set(current)
        next.delete(target.id)
        return next
      })
    }
  }, [currentBookmarks, meetingId, pendingIds])

  return {
    bookmarks: Object.values(currentBookmarks),
    bookmarkedIds,
    pendingIds,
    error: state.meetingId === meetingId ? state.error : null,
    clearError: () => setState((current) => ({ ...current, error: null })),
    toggle,
  }
}

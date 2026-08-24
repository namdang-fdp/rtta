"use client"

import { useCallback, useMemo, useState } from "react"

import type { TranslationUtterance } from "@/types/live"

/**
 * S05-only interaction adapter. The hook intentionally contains every local/demo
 * mutation so a future meeting-command service can replace it without changing
 * translation rendering components.
 */
export function useLocalMeetingActions() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => new Set())
  const [noteTarget, setNoteTarget] = useState<TranslationUtterance | null>(null)
  const [explanationTarget, setExplanationTarget] = useState<TranslationUtterance | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const toggleBookmark = useCallback((utterance: TranslationUtterance) => {
    setBookmarkedIds((current) => {
      const next = new Set(current)
      if (next.has(utterance.id)) next.delete(utterance.id)
      else next.add(utterance.id)
      return next
    })
  }, [])

  const saveLocalNote = useCallback((utteranceId: string, note: string) => {
    setNoteDrafts((current) => ({ ...current, [utteranceId]: note }))
    setNoteTarget(null)
  }, [])

  return useMemo(
    () => ({
      bookmarkedIds,
      noteDrafts,
      noteTarget,
      explanationTarget,
      toggleBookmark,
      openNote: setNoteTarget,
      closeNote: () => setNoteTarget(null),
      saveLocalNote,
      openExplanation: setExplanationTarget,
      closeExplanation: () => setExplanationTarget(null),
    }),
    [bookmarkedIds, explanationTarget, noteDrafts, noteTarget, saveLocalNote, toggleBookmark],
  )
}

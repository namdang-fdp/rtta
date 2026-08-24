"use client"

import { useCallback, useMemo, useState } from "react"

import type { TranslationUtterance } from "@/types/live"

/**
 * Temporary adapter for note and explanation surfaces until their backend phases.
 * Bookmarks deliberately live in the persisted meeting bookmark hook.
 */
export function useLocalMeetingActions() {
  const [noteTarget, setNoteTarget] = useState<TranslationUtterance | null>(null)
  const [explanationTarget, setExplanationTarget] = useState<TranslationUtterance | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const saveLocalNote = useCallback((utteranceId: string, note: string) => {
    setNoteDrafts((current) => ({ ...current, [utteranceId]: note }))
    setNoteTarget(null)
  }, [])

  return useMemo(
    () => ({
      noteDrafts,
      noteTarget,
      explanationTarget,
      openNote: setNoteTarget,
      closeNote: () => setNoteTarget(null),
      saveLocalNote,
      openExplanation: setExplanationTarget,
      closeExplanation: () => setExplanationTarget(null),
    }),
    [explanationTarget, noteDrafts, noteTarget, saveLocalNote],
  )
}

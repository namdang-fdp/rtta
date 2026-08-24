"use client"

import { useMemo, useState } from "react"

import type { TranslationUtterance } from "@/types/live"

/**
 * Temporary adapter for the explanation surface until its backend phase.
 */
export function useLocalMeetingActions() {
  const [explanationTarget, setExplanationTarget] = useState<TranslationUtterance | null>(null)

  return useMemo(
    () => ({
      explanationTarget,
      openExplanation: setExplanationTarget,
      closeExplanation: () => setExplanationTarget(null),
    }),
    [explanationTarget],
  )
}

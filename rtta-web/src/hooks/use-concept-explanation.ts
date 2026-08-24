"use client"

import { useCallback, useState } from "react"

import { explainConcept } from "@/lib/api/ai"
import type { AiExplanationDto, ExplanationDepth } from "@/types/api"
import type { MeetingMoment } from "@/types/meeting"

export function useConceptExplanation() {
  const [target, setTarget] = useState<MeetingMoment | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const [userQuestion, setUserQuestion] = useState("")
  const [response, setResponse] = useState<AiExplanationDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = useCallback((nextTarget: MeetingMoment, initialSelection = "") => {
    setTarget(nextTarget)
    setSelectedText(initialSelection.trim().slice(0, 500))
    setUserQuestion("")
    setResponse(null)
    setError(null)
  }, [])

  const close = useCallback(() => {
    setTarget(null)
    setResponse(null)
    setError(null)
  }, [])

  const generate = useCallback(async (depth: ExplanationDepth) => {
    if (!target || loading || !selectedText.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const result = await explainConcept(target.meetingId, {
        utteranceId: target.utteranceId,
        selectedText: selectedText.trim(),
        userQuestion: userQuestion.trim() || undefined,
        depth,
      })
      setResponse(result)
    } catch (caught) {
      setError(caught instanceof Error
        ? caught.message
        : "RTTA could not generate the explanation. Please try again explicitly.")
    } finally {
      setLoading(false)
    }
  }, [loading, selectedText, target, userQuestion])

  return {
    target,
    selectedText,
    setSelectedText,
    userQuestion,
    setUserQuestion,
    response,
    loading,
    error,
    open,
    close,
    generate,
  }
}

export type ConceptExplanationController = ReturnType<typeof useConceptExplanation>

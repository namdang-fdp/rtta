"use client"

import { useCallback, useEffect, useState } from "react"

import { explainConcept, listExplanations } from "@/lib/api/ai"
import type { AiExplanationDto, ExplanationDepth } from "@/types/api"
import type { MeetingMoment } from "@/types/meeting"

export function useConceptExplanation() {
  const [target, setTarget] = useState<MeetingMoment | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const [userQuestion, setUserQuestion] = useState("")
  const [history, setHistory] = useState<AiExplanationDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = useCallback((nextTarget: MeetingMoment, initialSelection = "") => {
    setTarget(nextTarget)
    setSelectedText((initialSelection.trim() || nextTarget.translatedText).slice(0, 500))
    setUserQuestion("")
    setHistory([])
    setHistoryLoading(true)
    setError(null)
  }, [])

  const close = useCallback(() => {
    setTarget(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!target) return
    const controller = new AbortController()
    void listExplanations(target.meetingId, target.utteranceId, controller.signal)
      .then(setHistory)
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setError("Không thể tải lịch sử giải thích. Vui lòng thử lại.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false)
      })
    return () => controller.abort()
  }, [target])

  const generate = useCallback(async (depth: ExplanationDepth) => {
    if (!target || loading || !selectedText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await explainConcept(target.meetingId, {
        utteranceId: target.utteranceId,
        selectedText: selectedText.trim(),
        userQuestion: userQuestion.trim() || undefined,
        depth,
      })
      setHistory((current) => [...current, result].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      ))
      setUserQuestion("")
    } catch {
      setError("RTTA chưa thể giải thích đoạn này. Vui lòng thử lại.")
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
    history,
    historyLoading,
    response: history.at(-1) ?? null,
    loading,
    error,
    open,
    close,
    generate,
  }
}

export type ConceptExplanationController = ReturnType<typeof useConceptExplanation>

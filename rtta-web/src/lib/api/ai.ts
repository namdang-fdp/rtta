import { apiRequest } from "@/lib/api/client"
import type { AiExplanationDto, ExplanationDepth } from "@/types/api"

export function listExplanations(
  meetingId: string,
  utteranceId: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ utteranceId })
  return apiRequest<AiExplanationDto[]>(
    `/api/meetings/${encodeURIComponent(meetingId)}/ai/explanations?${params}`,
    { signal },
  )
}

export function explainConcept(
  meetingId: string,
  input: {
    utteranceId: string
    selectedText: string
    userQuestion?: string
    depth: ExplanationDepth
  },
) {
  return apiRequest<AiExplanationDto>(
    `/api/meetings/${encodeURIComponent(meetingId)}/ai/explain`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
}

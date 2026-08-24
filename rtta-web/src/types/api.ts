export type MeetingStatus = "LIVE" | "COMPLETED" | "FAILED"

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface MeetingDto {
  id: string
  liveSessionId: string
  title: string
  sourceLanguage: string
  targetLanguage: string
  status: MeetingStatus
  startedAt: string
  endedAt: string | null
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
  transcriptUtteranceCount: number
}

export interface TranscriptUtteranceDto {
  id: string
  meetingId: string
  ordinal: number
  sourceText: string
  translatedText: string
  offsetMs: number
  durationMs: number
  observedAt: string
  createdAt: string
  providerMetadata: Record<string, unknown> | null
}

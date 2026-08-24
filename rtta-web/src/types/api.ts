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

export interface BookmarkDto {
  id: string
  meetingId: string
  utteranceId: string | null
  offsetMs: number | null
  label: string | null
  sourceText: string | null
  translatedText: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface MeetingSummaryDto {
  id: string
  meetingId: string
  model: string
  summaryMarkdown: string
  structuredData: Record<string, unknown> | null
  createdAt: string
}

export interface ResearchNoteDto {
  id: string
  meetingId: string
  utteranceId: string | null
  bookmarkId: string | null
  content: string
  offsetMs: number | null
  sourceText: string | null
  translatedText: string | null
  createdAt: string
  updatedAt: string
}

export type ExplanationDepth = "QUICK" | "DEEP"

export interface AiExplanationDto {
  id: string | null
  meetingId: string
  utteranceId: string
  selectedText: string
  userQuestion: string | null
  requestedDepth: ExplanationDepth
  effectiveDepth: ExplanationDepth
  deepModelFallback: boolean
  model: string
  responseMarkdown: string
  citations: Array<Record<string, unknown>>
  contextWindow: {
    previousUtterances: number
    followingUtterances: number
    documentChunks: number
  }
  createdAt: string
}

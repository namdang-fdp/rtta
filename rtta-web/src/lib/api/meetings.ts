import { apiRequest } from "@/lib/api/client"
import type { MeetingDto, PageResponse, TranscriptUtteranceDto } from "@/types/api"

interface PageOptions {
  page?: number
  size?: number
  signal?: AbortSignal
}

export function listMeetings({ page = 0, size = 20, signal }: PageOptions = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<PageResponse<MeetingDto>>(`/api/meetings?${params}`, { signal })
}

export function getMeeting(meetingId: string, signal?: AbortSignal) {
  return apiRequest<MeetingDto>(`/api/meetings/${encodeURIComponent(meetingId)}`, { signal })
}

export function getTranscript(
  meetingId: string,
  options: PageOptions & { query?: string } = {},
) {
  const { page = 0, size = 100, query, signal } = options
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (query?.trim()) params.set("query", query.trim())
  return apiRequest<PageResponse<TranscriptUtteranceDto>>(
    `/api/meetings/${encodeURIComponent(meetingId)}/transcript?${params}`,
    { signal },
  )
}

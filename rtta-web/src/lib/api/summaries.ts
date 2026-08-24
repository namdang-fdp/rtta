import { apiRequest } from "@/lib/api/client"
import type { MeetingSummaryDto } from "@/types/api"

export async function getMeetingSummary(meetingId: string, signal?: AbortSignal) {
  const summary = await apiRequest<MeetingSummaryDto | undefined>(
    `/api/meetings/${encodeURIComponent(meetingId)}/summary`,
    { signal },
  )
  return summary ?? null
}

export function generateMeetingSummary(meetingId: string) {
  return apiRequest<MeetingSummaryDto>(
    `/api/meetings/${encodeURIComponent(meetingId)}/summary`,
    { method: "POST" },
  )
}

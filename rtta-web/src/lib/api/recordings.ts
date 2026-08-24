import { apiRequest, getApiBaseUrl } from "@/lib/api/client"
import type { RecordingDto } from "@/types/api"

const path = (meetingId: string) => `/api/meetings/${encodeURIComponent(meetingId)}/recordings`

export function listRecordings(meetingId: string, signal?: AbortSignal) {
  return apiRequest<RecordingDto[]>(path(meetingId), { signal })
}

export function startRecording(meetingId: string) {
  return apiRequest<RecordingDto>(path(meetingId), { method: "POST" })
}

export function stopRecording(meetingId: string, recordingId: string) {
  return apiRequest<RecordingDto>(
    `${path(meetingId)}/${encodeURIComponent(recordingId)}/stop`,
    { method: "POST" },
  )
}

export function recordingPlaybackUrl(meetingId: string, recordingId: string) {
  return `${getApiBaseUrl()}${path(meetingId)}/${encodeURIComponent(recordingId)}/play`
}

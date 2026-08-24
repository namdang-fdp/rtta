import { apiRequest } from "@/lib/api/client"
import type { ResearchDocumentDto } from "@/types/api"

const path = (meetingId: string) => `/api/meetings/${encodeURIComponent(meetingId)}/documents`

export function listDocuments(meetingId: string, signal?: AbortSignal) {
  return apiRequest<ResearchDocumentDto[]>(path(meetingId), { signal })
}

export function uploadDocument(meetingId: string, file: File) {
  const body = new FormData()
  body.append("file", file)
  return apiRequest<ResearchDocumentDto>(path(meetingId), { method: "POST", body })
}

export function deleteDocument(meetingId: string, documentId: string) {
  return apiRequest<void>(`${path(meetingId)}/${encodeURIComponent(documentId)}`, { method: "DELETE" })
}

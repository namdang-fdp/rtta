import { apiRequest } from "@/lib/api/client"
import type { ResearchNoteDto } from "@/types/api"

export interface CreateResearchNoteInput {
  utteranceId?: string
  bookmarkId?: string
  content: string
}

export function listNotes(meetingId: string, signal?: AbortSignal) {
  return apiRequest<ResearchNoteDto[]>(
    `/api/meetings/${encodeURIComponent(meetingId)}/notes`,
    { signal },
  )
}

export function createNote(meetingId: string, input: CreateResearchNoteInput) {
  return apiRequest<ResearchNoteDto>(
    `/api/meetings/${encodeURIComponent(meetingId)}/notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
}

export function updateNote(meetingId: string, noteId: string, content: string) {
  return apiRequest<ResearchNoteDto>(
    `/api/meetings/${encodeURIComponent(meetingId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  )
}

export function deleteNote(meetingId: string, noteId: string) {
  return apiRequest<void>(
    `/api/meetings/${encodeURIComponent(meetingId)}/notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE" },
  )
}

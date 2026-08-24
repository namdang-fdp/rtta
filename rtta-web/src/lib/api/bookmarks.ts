import { apiRequest } from "@/lib/api/client"
import type { BookmarkDto } from "@/types/api"

export function listBookmarks(meetingId: string, signal?: AbortSignal) {
  return apiRequest<BookmarkDto[]>(
    `/api/meetings/${encodeURIComponent(meetingId)}/bookmarks`,
    { signal },
  )
}

export function createBookmark(
  meetingId: string,
  input: { utteranceId?: string; offsetMs?: number; label?: string },
) {
  return apiRequest<BookmarkDto>(
    `/api/meetings/${encodeURIComponent(meetingId)}/bookmarks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
}

export function deleteBookmark(meetingId: string, bookmarkId: string) {
  return apiRequest<void>(
    `/api/meetings/${encodeURIComponent(meetingId)}/bookmarks/${encodeURIComponent(bookmarkId)}`,
    { method: "DELETE" },
  )
}

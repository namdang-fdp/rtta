import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CompletedMeetingOverview } from "@/components/meeting/completed-meeting-overview"
import { listBookmarks } from "@/lib/api/bookmarks"
import { getMeeting, listMeetings } from "@/lib/api/meetings"
import { listNotes } from "@/lib/api/notes"
import { listRecordings } from "@/lib/api/recordings"
import { generateMeetingSummary, getMeetingSummary } from "@/lib/api/summaries"
import type { MeetingDto, MeetingSummaryDto } from "@/types/api"

vi.mock("@/lib/api/meetings", () => ({ getMeeting: vi.fn(), listMeetings: vi.fn() }))
vi.mock("@/lib/api/bookmarks", () => ({
  createBookmark: vi.fn(), deleteBookmark: vi.fn(), listBookmarks: vi.fn(),
}))
vi.mock("@/lib/api/notes", () => ({
  createNote: vi.fn(), deleteNote: vi.fn(), listNotes: vi.fn(), updateNote: vi.fn(),
}))
vi.mock("@/lib/api/summaries", () => ({
  generateMeetingSummary: vi.fn(), getMeetingSummary: vi.fn(),
}))
vi.mock("@/lib/api/recordings", () => ({
  listRecordings: vi.fn(),
  recordingPlaybackUrl: vi.fn(() => "http://localhost:8080/recording.wav"),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
}))

const meeting: MeetingDto = {
  id: "meeting-1",
  liveSessionId: "session-1",
  title: "Quantum Materials Seminar",
  sourceLanguage: "en-US",
  targetLanguage: "vi-VN",
  status: "COMPLETED",
  startedAt: "2026-08-25T00:00:00Z",
  endedAt: "2026-08-25T01:00:00Z",
  createdAt: "2026-08-25T00:00:00Z",
  updatedAt: "2026-08-25T01:00:00Z",
  metadata: {},
  transcriptUtteranceCount: 42,
}

const persistedSummary: MeetingSummaryDto = {
  id: "summary-1",
  meetingId: meeting.id,
  model: "gemini-test-flash",
  summaryMarkdown: "# Tóm tắt\n\nBuổi họp phân tích Hamiltonian.",
  structuredData: { strategy: "DIRECT", chunkCount: 1 },
  createdAt: "2026-08-25T01:01:00Z",
}

describe("CompletedMeetingOverview", () => {
  beforeEach(() => {
    vi.mocked(listMeetings).mockResolvedValue({ items: [meeting], page: 0, size: 1, totalItems: 1, totalPages: 1 })
    vi.mocked(getMeeting).mockResolvedValue(meeting)
    vi.mocked(listBookmarks).mockResolvedValue([{
      id: "bookmark-1", meetingId: meeting.id, utteranceId: "utterance-1", offsetMs: 62_000,
      label: "Key definition", sourceText: "The Hamiltonian determines time evolution.",
      translatedText: "Hamiltonian quyết định sự tiến triển theo thời gian.",
      createdAt: "2026-08-25T00:01:02Z", metadata: null,
    }])
    vi.mocked(listNotes).mockResolvedValue([{
      id: "note-1", meetingId: meeting.id, utteranceId: "utterance-1", bookmarkId: null,
      content: "Compare with the source paper.", offsetMs: 62_000,
      sourceText: "The Hamiltonian determines time evolution.",
      translatedText: "Hamiltonian quyết định sự tiến triển theo thời gian.",
      createdAt: "2026-08-25T00:01:03Z", updatedAt: "2026-08-25T00:01:03Z",
    }])
    vi.mocked(generateMeetingSummary).mockReset()
    vi.mocked(listRecordings).mockResolvedValue([])
  })

  it("renders a persisted summary, bookmarks, and notes after refresh", async () => {
    vi.mocked(getMeetingSummary).mockResolvedValue(persistedSummary)

    render(<CompletedMeetingOverview meetingId={meeting.id} />)

    expect(await screen.findByText("Buổi họp phân tích Hamiltonian.")).toBeInTheDocument()
    expect(screen.getByText("Hamiltonian quyết định sự tiến triển theo thời gian.")).toBeInTheDocument()
    expect(screen.getByText("Compare with the source paper.")).toBeInTheDocument()
    expect(screen.queryByText(/Action Items/i)).not.toBeInTheDocument()
  })

  it("generates only after explicit user action and retains the response", async () => {
    vi.mocked(getMeetingSummary).mockResolvedValue(null)
    vi.mocked(generateMeetingSummary).mockResolvedValue(persistedSummary)

    render(<CompletedMeetingOverview meetingId={meeting.id} />)

    expect(await screen.findByText("No summary has been generated")).toBeInTheDocument()
    expect(generateMeetingSummary).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Generate Summary" }))

    await waitFor(() => expect(generateMeetingSummary).toHaveBeenCalledWith(meeting.id))
    expect(await screen.findByText("Buổi họp phân tích Hamiltonian.")).toBeInTheDocument()
  })
})

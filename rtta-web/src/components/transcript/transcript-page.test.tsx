import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TranscriptPage } from "@/components/transcript/transcript-page"
import { getMeeting, getTranscript, listMeetings } from "@/lib/api/meetings"
import { createBookmark, deleteBookmark, listBookmarks } from "@/lib/api/bookmarks"
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/api/notes"
import type { MeetingDto, TranscriptUtteranceDto } from "@/types/api"

vi.mock("@/lib/api/meetings", () => ({
  getMeeting: vi.fn(),
  getTranscript: vi.fn(),
  listMeetings: vi.fn(),
}))

vi.mock("@/lib/api/bookmarks", () => ({
  createBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
  listBookmarks: vi.fn(),
}))

vi.mock("@/lib/api/notes", () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  listNotes: vi.fn(),
  updateNote: vi.fn(),
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
  transcriptUtteranceCount: 1,
}

const utterance: TranscriptUtteranceDto = {
  id: "utterance-1",
  meetingId: meeting.id,
  ordinal: 1,
  sourceText: "The Hamiltonian determines time evolution.",
  translatedText: "Hamiltonian quyết định sự tiến triển theo thời gian.",
  offsetMs: 62_000,
  durationMs: 2_000,
  observedAt: "2026-08-25T00:01:04Z",
  createdAt: "2026-08-25T00:01:04Z",
  providerMetadata: { provider: "azure" },
}

describe("TranscriptPage", () => {
  beforeEach(() => {
    vi.mocked(createBookmark).mockReset()
    vi.mocked(deleteBookmark).mockReset()
    vi.mocked(listBookmarks).mockReset()
    vi.mocked(listBookmarks).mockResolvedValue([])
    vi.mocked(createNote).mockReset()
    vi.mocked(deleteNote).mockReset()
    vi.mocked(listNotes).mockReset()
    vi.mocked(updateNote).mockReset()
    vi.mocked(listNotes).mockResolvedValue([])
    vi.mocked(listMeetings).mockResolvedValue({
      items: [meeting], page: 0, size: 1, totalItems: 1, totalPages: 1,
    })
    vi.mocked(getMeeting).mockResolvedValue(meeting)
    vi.mocked(getTranscript).mockResolvedValue({
      items: [utterance], page: 0, size: 100, totalItems: 1, totalPages: 1,
    })
  })

  it("restores linked notes and their translated context after a fresh render", async () => {
    vi.mocked(listNotes).mockResolvedValue([{
      id: "note-1",
      meetingId: meeting.id,
      utteranceId: utterance.id,
      bookmarkId: null,
      content: "Compare this with the source paper.",
      offsetMs: utterance.offsetMs,
      sourceText: utterance.sourceText,
      translatedText: utterance.translatedText,
      createdAt: "2026-08-25T00:01:05Z",
      updatedAt: "2026-08-25T00:01:05Z",
    }])

    render(<TranscriptPage meetingId={meeting.id} />)

    expect(await screen.findByText("Compare this with the source paper.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit research note" })).toBeInTheDocument()
  })

  it("persists a timestamp-linked note from the transcript composer", async () => {
    vi.mocked(createNote).mockResolvedValue({
      id: "note-new",
      meetingId: meeting.id,
      utteranceId: utterance.id,
      bookmarkId: null,
      content: "Review this derivation.",
      offsetMs: utterance.offsetMs,
      sourceText: utterance.sourceText,
      translatedText: utterance.translatedText,
      createdAt: "2026-08-25T00:01:05Z",
      updatedAt: "2026-08-25T00:01:05Z",
    })
    render(<TranscriptPage meetingId={meeting.id} />)

    fireEvent.click(await screen.findByRole("button", { name: "Add research note" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Your note" }), {
      target: { value: "Review this derivation." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save note" }))

    await waitFor(() => expect(createNote).toHaveBeenCalledWith(meeting.id, {
      utteranceId: utterance.id,
      content: "Review this derivation.",
    }))
    expect(await screen.findByText("Review this derivation.")).toBeInTheDocument()
  })

  it("restores persisted bookmark state after a fresh render", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([{
      id: "bookmark-existing",
      meetingId: meeting.id,
      utteranceId: utterance.id,
      offsetMs: utterance.offsetMs,
      label: null,
      createdAt: "2026-08-25T00:01:05Z",
      metadata: null,
    }])

    render(<TranscriptPage meetingId={meeting.id} />)

    expect(await screen.findByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true")
  })

  it("rolls back an optimistic bookmark when persistence fails", async () => {
    vi.mocked(createBookmark).mockRejectedValue(new Error("The bookmark could not be saved."))
    render(<TranscriptPage meetingId={meeting.id} />)

    fireEvent.click(await screen.findByRole("button", { name: "Bookmark utterance" }))

    expect(await screen.findByRole("button", { name: "Bookmark utterance" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("The bookmark could not be saved.")).toBeInTheDocument()
  })

  it("persists a bookmark and reflects the saved state", async () => {
    vi.mocked(createBookmark).mockResolvedValue({
      id: "bookmark-1",
      meetingId: meeting.id,
      utteranceId: utterance.id,
      offsetMs: utterance.offsetMs,
      label: null,
      createdAt: "2026-08-25T00:01:05Z",
      metadata: null,
    })
    vi.mocked(deleteBookmark).mockResolvedValue()
    render(<TranscriptPage meetingId={meeting.id} />)

    const button = await screen.findByRole("button", { name: "Bookmark utterance" })
    fireEvent.click(button)

    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith(meeting.id, {
      utteranceId: utterance.id,
      offsetMs: utterance.offsetMs,
    }))
    expect(await screen.findByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true")
  })

  it("renders persisted Vietnamese primary and English secondary transcript data", async () => {
    render(<TranscriptPage meetingId={meeting.id} />)

    const vietnamese = await screen.findByText(utterance.translatedText)
    const english = screen.getByText(utterance.sourceText)
    expect(screen.getByRole("heading", { name: meeting.title })).toBeInTheDocument()
    expect(screen.getByText("1:02")).toBeInTheDocument()
    expect(vietnamese).toHaveAttribute("lang", "vi")
    expect(vietnamese).toHaveAttribute("data-language-priority", "primary")
    expect(english).toHaveAttribute("lang", "en")
    expect(english).toHaveAttribute("data-language-priority", "secondary")
    expect(screen.queryByText(/demo transcript/i)).not.toBeInTheDocument()
  })

  it("searches the persisted transcript through the API", async () => {
    render(<TranscriptPage meetingId={meeting.id} />)
    await screen.findByText(utterance.translatedText)

    fireEvent.change(screen.getByRole("searchbox", { name: "Search transcript" }), {
      target: { value: "Hamiltonian" },
    })

    await waitFor(() => {
      expect(getTranscript).toHaveBeenLastCalledWith(meeting.id, expect.objectContaining({
        page: 0,
        query: "Hamiltonian",
      }))
    })
  })

  it("renders a restrained empty archive state", async () => {
    vi.mocked(listMeetings).mockResolvedValue({
      items: [], page: 0, size: 1, totalItems: 0, totalPages: 0,
    })

    render(<TranscriptPage />)

    expect(await screen.findByRole("heading", { name: "No meetings yet" })).toBeInTheDocument()
    expect(getMeeting).not.toHaveBeenCalled()
    expect(getTranscript).not.toHaveBeenCalled()
  })
})

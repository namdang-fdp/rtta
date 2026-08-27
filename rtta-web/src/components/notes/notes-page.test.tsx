import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NotesPage } from "@/components/notes/notes-page"
import { getMeeting, listMeetings } from "@/lib/api/meetings"
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/api/notes"
import type { MeetingDto, ResearchNoteDto } from "@/types/api"

vi.mock("@/lib/api/meetings", () => ({ getMeeting: vi.fn(), listMeetings: vi.fn() }))
vi.mock("@/lib/api/notes", () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  listNotes: vi.fn(),
  updateNote: vi.fn(),
}))

const meeting: MeetingDto = {
  id: "meeting-notes",
  liveSessionId: "session-notes",
  title: "Condensed Matter Seminar",
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

const linkedNote: ResearchNoteDto = {
  id: "note-linked",
  meetingId: meeting.id,
  utteranceId: "utterance-1",
  bookmarkId: null,
  content: "Compare this argument with the uploaded paper.",
  offsetMs: 75_000,
  sourceText: "The gap closes at the critical point.",
  translatedText: "Khe năng lượng đóng lại tại điểm tới hạn.",
  createdAt: "2026-08-25T00:01:16Z",
  updatedAt: "2026-08-25T00:01:16Z",
}

describe("NotesPage", () => {
  beforeEach(() => {
    vi.mocked(getMeeting).mockReset()
    vi.mocked(listMeetings).mockReset()
    vi.mocked(createNote).mockReset()
    vi.mocked(deleteNote).mockReset()
    vi.mocked(listNotes).mockReset()
    vi.mocked(updateNote).mockReset()
    vi.mocked(getMeeting).mockResolvedValue(meeting)
    vi.mocked(listNotes).mockResolvedValue([linkedNote])
  })

  it("renders persisted notes with timestamp and bilingual utterance context", async () => {
    render(<NotesPage meetingId={meeting.id} />)

    expect(await screen.findByText(linkedNote.content)).toBeInTheDocument()
    expect(screen.getByText("1:15")).toBeInTheDocument()
    expect(screen.getByText(linkedNote.translatedText!)).toHaveAttribute("lang", "vi")
    expect(screen.getByText(linkedNote.sourceText!)).toHaveAttribute("lang", "en")
  })

  it("creates a meeting-level research note", async () => {
    vi.mocked(listNotes).mockResolvedValue([])
    const general = { ...linkedNote, id: "note-general", utteranceId: null, offsetMs: null }
    vi.mocked(createNote).mockResolvedValue(general)
    render(<NotesPage meetingId={meeting.id} />)
    await screen.findByRole("heading", { name: "Chưa có ghi chú cho cuộc họp này" })

    fireEvent.change(screen.getByRole("textbox", { name: "Ghi chú chung mới" }), {
      target: { value: general.content },
    })
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }))

    await waitFor(() => expect(createNote).toHaveBeenCalledWith(meeting.id, { content: general.content }))
    expect(await screen.findByText(general.content)).toBeInTheDocument()
  })

  it("requires a second click before deleting a note", async () => {
    vi.mocked(deleteNote).mockResolvedValue()
    render(<NotesPage meetingId={meeting.id} />)
    await screen.findByText(linkedNote.content)

    fireEvent.click(screen.getByRole("button", { name: "Xóa" }))
    expect(deleteNote).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }))

    await waitFor(() => expect(deleteNote).toHaveBeenCalledWith(meeting.id, linkedNote.id))
    expect(screen.queryByText(linkedNote.content)).not.toBeInTheDocument()
  })
})

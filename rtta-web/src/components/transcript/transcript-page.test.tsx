import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TranscriptPage } from "@/components/transcript/transcript-page"
import { getMeeting, getTranscript, listMeetings } from "@/lib/api/meetings"
import { createBookmark, deleteBookmark, listBookmarks } from "@/lib/api/bookmarks"
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/api/notes"
import { explainConcept, listExplanations } from "@/lib/api/ai"
import type { AiExplanationDto, MeetingDto, TranscriptUtteranceDto } from "@/types/api"

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

vi.mock("@/lib/api/ai", () => ({ explainConcept: vi.fn(), listExplanations: vi.fn() }))

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

const firstExplanation: AiExplanationDto = {
  id: "explanation-1",
  meetingId: meeting.id,
  utteranceId: utterance.id,
  selectedText: "Hamiltonian",
  userQuestion: "Hamiltonian là gì?",
  requestedDepth: "QUICK",
  effectiveDepth: "QUICK",
  deepModelFallback: false,
  model: "gemini-test-flash",
  responseMarkdown: "## Giải thích ngắn\n\n**Hamiltonian** biểu diễn năng lượng của hệ.",
  citations: [],
  contextWindow: { previousUtterances: 3, followingUtterances: 1, documentChunks: 0 },
  createdAt: "2026-08-25T00:01:06Z",
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
    vi.mocked(explainConcept).mockReset()
    vi.mocked(listExplanations).mockReset()
    vi.mocked(listExplanations).mockResolvedValue([])
    vi.mocked(listMeetings).mockResolvedValue({
      items: [meeting], page: 0, size: 1, totalItems: 1, totalPages: 1,
    })
    vi.mocked(getMeeting).mockResolvedValue(meeting)
    vi.mocked(getTranscript).mockResolvedValue({
      items: [utterance], page: 0, size: 100, totalItems: 1, totalPages: 1,
    })
  })

  it("only asks AI after an explicit action and persists the response", async () => {
    vi.mocked(explainConcept).mockResolvedValue(firstExplanation)
    render(<TranscriptPage meetingId={meeting.id} />)

    fireEvent.click(await screen.findByRole("button", { name: "Hỏi AI về đoạn này" }))
    expect(explainConcept).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole("textbox", { name: "Bạn muốn hiểu điều gì?" }), {
      target: { value: "Hamiltonian là gì?" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Giải thích đoạn này" }))

    await waitFor(() => expect(explainConcept).toHaveBeenCalledWith(meeting.id, {
      utteranceId: utterance.id,
      selectedText: utterance.translatedText,
      userQuestion: "Hamiltonian là gì?",
      depth: "QUICK",
    }))
    expect(await screen.findByRole("heading", { name: "Giải thích ngắn" })).toBeInTheDocument()
    expect(screen.getByText("Hamiltonian", { selector: "strong" })).toBeInTheDocument()
    expect(screen.queryByText("gemini-test-flash")).not.toBeInTheDocument()
  })

  it("loads multiple persisted explanations chronologically after reopen", async () => {
    const followUp = {
      ...firstExplanation,
      id: "explanation-2",
      userQuestion: "Vì sao nó quyết định tiến triển theo thời gian?",
      responseMarkdown: "Câu trả lời thứ hai.",
      createdAt: "2026-08-25T00:02:06Z",
    }
    vi.mocked(listExplanations).mockResolvedValue([firstExplanation, followUp])
    render(<TranscriptPage meetingId={meeting.id} />)

    fireEvent.click(await screen.findByRole("button", { name: "Hỏi AI về đoạn này" }))
    const firstQuestion = await screen.findByText("Hamiltonian là gì?")
    const secondQuestion = screen.getByText("Vì sao nó quyết định tiến triển theo thời gian?")
    expect(firstQuestion.compareDocumentPosition(secondQuestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Đóng phần giải thích" }))
    fireEvent.click(screen.getByRole("button", { name: "Hỏi AI về đoạn này" }))

    await waitFor(() => expect(listExplanations).toHaveBeenCalledTimes(2))
    expect(await screen.findByText("Câu trả lời thứ hai.")).toBeInTheDocument()
  })

  it("restores explanation history from backend persistence after a fresh render", async () => {
    vi.mocked(listExplanations).mockResolvedValue([firstExplanation])
    const firstView = render(<TranscriptPage meetingId={meeting.id} />)
    fireEvent.click(await screen.findByRole("button", { name: "Hỏi AI về đoạn này" }))
    expect(await screen.findByText("Hamiltonian là gì?")).toBeInTheDocument()
    firstView.unmount()

    render(<TranscriptPage meetingId={meeting.id} />)
    fireEvent.click(await screen.findByRole("button", { name: "Hỏi AI về đoạn này" }))

    expect(await screen.findByText("Hamiltonian là gì?")).toBeInTheDocument()
    expect(listExplanations).toHaveBeenLastCalledWith(meeting.id, utterance.id, expect.any(AbortSignal))
  })

  it("creates and displays a persisted follow-up explanation", async () => {
    const followUp = {
      ...firstExplanation,
      id: "explanation-2",
      userQuestion: "Vì sao tia X có thể làm tổn thương DNA?",
      responseMarkdown: "Tia X có thể ion hóa phân tử.",
      createdAt: "2026-08-25T00:02:06Z",
    }
    vi.mocked(listExplanations).mockResolvedValue([firstExplanation])
    vi.mocked(explainConcept).mockResolvedValue(followUp)
    render(<TranscriptPage meetingId={meeting.id} />)

    fireEvent.click(await screen.findByRole("button", { name: "Hỏi AI về đoạn này" }))
    const input = await screen.findByRole("textbox", { name: "Hỏi thêm về đoạn này" })
    fireEvent.change(input, { target: { value: followUp.userQuestion } })
    fireEvent.click(screen.getByRole("button", { name: "Hỏi tiếp" }))

    await waitFor(() => expect(explainConcept).toHaveBeenCalledWith(meeting.id, expect.objectContaining({
      utteranceId: utterance.id,
      userQuestion: followUp.userQuestion,
    })))
    expect(await screen.findByText("Tia X có thể ion hóa phân tử.")).toBeInTheDocument()
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
    expect(screen.getByRole("button", { name: "Sửa ghi chú" })).toBeInTheDocument()
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

    fireEvent.click(await screen.findByRole("button", { name: "Thêm ghi chú" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Ghi chú của bạn" }), {
      target: { value: "Review this derivation." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }))

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
      sourceText: utterance.sourceText,
      translatedText: utterance.translatedText,
      createdAt: "2026-08-25T00:01:05Z",
      metadata: null,
    }])

    render(<TranscriptPage meetingId={meeting.id} />)

    expect(await screen.findByRole("button", { name: "Bỏ lưu đoạn này" })).toHaveAttribute("aria-pressed", "true")
  })

  it("rolls back an optimistic bookmark when persistence fails", async () => {
    vi.mocked(createBookmark).mockRejectedValue(new Error("The bookmark could not be saved."))
    render(<TranscriptPage meetingId={meeting.id} />)

    fireEvent.click(await screen.findByRole("button", { name: "Lưu đoạn này" }))

    expect(await screen.findByRole("button", { name: "Lưu đoạn này" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("Không thể lưu đoạn này. Vui lòng thử lại.")).toBeInTheDocument()
  })

  it("persists a bookmark and reflects the saved state", async () => {
    vi.mocked(createBookmark).mockResolvedValue({
      id: "bookmark-1",
      meetingId: meeting.id,
      utteranceId: utterance.id,
      offsetMs: utterance.offsetMs,
      label: null,
      sourceText: utterance.sourceText,
      translatedText: utterance.translatedText,
      createdAt: "2026-08-25T00:01:05Z",
      metadata: null,
    })
    vi.mocked(deleteBookmark).mockResolvedValue()
    render(<TranscriptPage meetingId={meeting.id} />)

    const button = await screen.findByRole("button", { name: "Lưu đoạn này" })
    fireEvent.click(button)

    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith(meeting.id, {
      utteranceId: utterance.id,
      offsetMs: utterance.offsetMs,
    }))
    expect(await screen.findByRole("button", { name: "Bỏ lưu đoạn này" })).toHaveAttribute("aria-pressed", "true")
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
    expect(screen.getByRole("link", { name: "Bản ghi" })).toHaveAttribute(
      "href",
      `/meetings/${meeting.id}/transcript`,
    )
    expect(screen.getByRole("link", { name: "Ghi chú" })).toHaveAttribute(
      "href",
      `/meetings/${meeting.id}/notes`,
    )
    expect(screen.queryByText(/demo transcript/i)).not.toBeInTheDocument()
  })

  it("searches the persisted transcript through the API", async () => {
    render(<TranscriptPage meetingId={meeting.id} />)
    await screen.findByText(utterance.translatedText)

    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm trong bản ghi" }), {
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

    expect(await screen.findByRole("heading", { name: "Chưa có cuộc họp nào" })).toBeInTheDocument()
    expect(getMeeting).not.toHaveBeenCalled()
    expect(getTranscript).not.toHaveBeenCalled()
  })
})

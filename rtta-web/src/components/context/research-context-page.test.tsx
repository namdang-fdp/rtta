import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ResearchContextPage } from "@/components/context/research-context-page"
import { deleteDocument, listDocuments, uploadDocument } from "@/lib/api/documents"
import { getMeeting, listMeetings } from "@/lib/api/meetings"
import type { MeetingDto, ResearchDocumentDto } from "@/types/api"

vi.mock("@/lib/api/meetings", () => ({ getMeeting: vi.fn(), listMeetings: vi.fn() }))
vi.mock("@/lib/api/documents", () => ({
  deleteDocument: vi.fn(), listDocuments: vi.fn(), uploadDocument: vi.fn(),
}))

const meeting: MeetingDto = {
  id: "meeting-1", liveSessionId: "session-1", title: "Quantum Seminar",
  sourceLanguage: "en-US", targetLanguage: "vi-VN", status: "COMPLETED",
  startedAt: "2026-08-25T00:00:00Z", endedAt: "2026-08-25T01:00:00Z",
  createdAt: "2026-08-25T00:00:00Z", updatedAt: "2026-08-25T01:00:00Z",
  metadata: {}, transcriptUtteranceCount: 20,
}

const ready: ResearchDocumentDto = {
  id: "document-1", meetingId: meeting.id, fileName: "hamiltonian.pdf",
  mediaType: "application/pdf", sizeBytes: 1_024, sha256: "a".repeat(64),
  status: "READY", createdAt: "2026-08-25T00:10:00Z",
  processedAt: "2026-08-25T00:10:05Z", errorMessage: null,
}

describe("ResearchContextPage", () => {
  beforeEach(() => {
    vi.mocked(listMeetings).mockResolvedValue({ items: [meeting], page: 0, size: 1, totalItems: 1, totalPages: 1 })
    vi.mocked(getMeeting).mockResolvedValue(meeting)
    vi.mocked(listDocuments).mockResolvedValue([ready])
    vi.mocked(uploadDocument).mockReset()
    vi.mocked(deleteDocument).mockReset()
  })

  it("renders persisted ready source metadata", async () => {
    render(<ResearchContextPage meetingId={meeting.id} />)

    expect(await screen.findByText("hamiltonian.pdf")).toBeInTheDocument()
    expect(screen.getByText("Ready for Explain")).toBeInTheDocument()
    expect(screen.getByText(/SHA-256 aaaaaaaaaa/)).toBeInTheDocument()
  })

  it("shows the real processing state after upload", async () => {
    vi.mocked(listDocuments).mockResolvedValue([])
    const processing = { ...ready, id: "document-2", fileName: "slides.pptx", status: "PROCESSING" as const, processedAt: null }
    vi.mocked(uploadDocument).mockResolvedValue(processing)
    render(<ResearchContextPage meetingId={meeting.id} />)
    await screen.findByText("No research material attached")

    const file = new File(["presentation"], "slides.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
    fireEvent.change(screen.getByLabelText("Research document file"), { target: { files: [file] } })

    await waitFor(() => expect(uploadDocument).toHaveBeenCalledWith(meeting.id, file))
    expect(await screen.findByText("slides.pptx")).toBeInTheDocument()
    expect(screen.getByText("Processing")).toBeInTheDocument()
  })
})

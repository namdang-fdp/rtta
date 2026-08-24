import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TranscriptPage } from "@/components/transcript/transcript-page"
import { getMeeting, getTranscript, listMeetings } from "@/lib/api/meetings"
import type { MeetingDto, TranscriptUtteranceDto } from "@/types/api"

vi.mock("@/lib/api/meetings", () => ({
  getMeeting: vi.fn(),
  getTranscript: vi.fn(),
  listMeetings: vi.fn(),
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
    vi.mocked(listMeetings).mockResolvedValue({
      items: [meeting], page: 0, size: 1, totalItems: 1, totalPages: 1,
    })
    vi.mocked(getMeeting).mockResolvedValue(meeting)
    vi.mocked(getTranscript).mockResolvedValue({
      items: [utterance], page: 0, size: 100, totalItems: 1, totalPages: 1,
    })
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

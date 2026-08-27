import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MeetingHistoryPage } from "@/components/meeting/meeting-history-page"
import { listMeetings } from "@/lib/api/meetings"
import type { MeetingDto } from "@/types/api"

vi.mock("@/lib/api/meetings", () => ({ listMeetings: vi.fn() }))

function meeting(id: string, title: string, startedAt: string): MeetingDto {
  return {
    id,
    liveSessionId: `session-${id}`,
    title,
    sourceLanguage: "en-US",
    targetLanguage: "vi-VN",
    status: "COMPLETED",
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + 3_600_000).toISOString(),
    createdAt: startedAt,
    updatedAt: startedAt,
    metadata: {},
    transcriptUtteranceCount: 12,
    bookmarkCount: 2,
    noteCount: 3,
    summaryAvailable: true,
    recordingAvailable: true,
  }
}

describe("MeetingHistoryPage", () => {
  const older = meeting("older", "Seminar cũ", "2026-08-24T03:00:00Z")
  const newer = meeting("newer", "Seminar mới", "2026-08-25T03:00:00Z")

  beforeEach(() => {
    vi.mocked(listMeetings).mockResolvedValue({
      items: [older, newer],
      page: 0,
      size: 100,
      totalItems: 2,
      totalPages: 1,
    })
  })

  it("renders multiple meetings newest first", async () => {
    render(<MeetingHistoryPage />)
    const list = await screen.findByRole("list", { name: "Danh sách cuộc họp, mới nhất trước" })
    const items = within(list).getAllByRole("listitem")

    expect(within(items[0]).getByRole("heading", { name: newer.title })).toBeInTheDocument()
    expect(within(items[1]).getByRole("heading", { name: older.title })).toBeInTheDocument()
    expect(screen.getAllByText("2 mục đã lưu")).toHaveLength(2)
  })

  it("navigates each item to its meeting overview", async () => {
    render(<MeetingHistoryPage />)

    expect(await screen.findByRole("link", { name: new RegExp(newer.title) }))
      .toHaveAttribute("href", `/meetings/${newer.id}`)
  })
})

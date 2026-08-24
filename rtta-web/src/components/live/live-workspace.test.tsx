import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LiveWorkspaceView } from "@/components/live/live-workspace"
import { initialLiveMeetingState } from "@/lib/realtime/live-reducer"
import type { LiveMeetingState } from "@/types/live"

const actions = {
  setFollowLive: vi.fn(),
  clearError: vi.fn(),
  bookmarkedIds: new Set<string>(),
  notedIds: new Set<string>(),
  onBookmark: vi.fn(),
  onNote: vi.fn(),
  onExplain: vi.fn(),
  explanationOpen: false,
  dockExplanation: false,
  closeExplanation: vi.fn(),
}

function renderState(state: LiveMeetingState) {
  return render(<LiveWorkspaceView state={state} {...actions} />)
}

describe("LiveWorkspaceView", () => {
  it("renders the idle waiting state", () => {
    renderState({ ...initialLiveMeetingState, connectionState: "connected" })

    expect(screen.getByRole("heading", { name: "Ready for your meeting" })).toBeInTheDocument()
    expect(screen.getByText(/Start the RTTA extension/)).toBeInTheDocument()
  })

  it("renders Vietnamese as primary and English as secondary in the live state", () => {
    renderState({
      ...initialLiveMeetingState,
      connectionState: "connected",
      sessionState: "live",
      activeSessionId: "current-session",
      sessionStartedAt: new Date().toISOString(),
      recentFinals: [{
        id: "final-1",
        sessionId: "current-session",
        sourceText: "Pulsars are rapidly rotating neutron stars.",
        translatedText: "Pulsar là những sao neutron quay cực nhanh.",
        offsetMs: 1_230,
        durationMs: 760,
        observedAt: "2026-08-25T00:00:01Z",
      }],
      currentPartial: {
        id: "partial-2",
        sessionId: "current-session",
        sourceText: "They emit beams",
        translatedText: "Chúng phát ra các chùm",
        offsetMs: 2_000,
        durationMs: 500,
        observedAt: "2026-08-25T00:00:02Z",
      },
    })

    const vietnamese = screen.getByText("Pulsar là những sao neutron quay cực nhanh.")
    const english = screen.getByText("Pulsars are rapidly rotating neutron stars.")
    expect(vietnamese).toHaveAttribute("data-language-priority", "primary")
    expect(vietnamese).toHaveAttribute("lang", "vi")
    expect(english).toHaveAttribute("data-language-priority", "secondary")
    expect(english).toHaveAttribute("lang", "en")
    expect(screen.getByText("Live")).toBeInTheDocument()
    expect(screen.getByText("EN → VI")).toBeInTheDocument()
  })

  it("renders a clear backend disconnected state", () => {
    renderState({ ...initialLiveMeetingState, connectionState: "disconnected" })

    expect(screen.getByRole("heading", { name: "Translation connection lost" })).toBeInTheDocument()
    expect(screen.getByText(/Check that the Spring service is running/)).toBeInTheDocument()
  })
})

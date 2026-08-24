import { describe, expect, it } from "vitest"

import {
  initialLiveMeetingState,
  liveMeetingReducer,
  MAX_RECENT_FINALS,
} from "@/lib/realtime/live-reducer"
import type { LiveMeetingState, TranslationServerEvent } from "@/types/live"

const sessionId = "session-current"

function startedState(): LiveMeetingState {
  return liveMeetingReducer(initialLiveMeetingState, {
    type: "SERVER_EVENT",
    event: {
      type: "SESSION_STARTED",
      sessionId,
      meetingId: "meeting-current",
      startedAt: "2026-08-25T00:00:00Z",
    },
  })
}

function translation(
  eventType: "PARTIAL" | "FINAL",
  sourceText: string,
  translatedText: string,
  offsetMs = 0,
  eventSessionId = sessionId,
): TranslationServerEvent {
  return {
    type: "TRANSLATION",
    sessionId: eventSessionId,
    meetingId: "meeting-current",
    utteranceId: eventType === "FINAL" ? `utterance-${offsetMs}` : null,
    eventType,
    sourceText,
    translatedText,
    offsetMs,
    durationMs: 500,
    observedAt: "2026-08-25T00:00:01Z",
  }
}

function reduceEvent(state: LiveMeetingState, event: TranslationServerEvent): LiveMeetingState {
  return liveMeetingReducer(state, { type: "SERVER_EVENT", event })
}

describe("liveMeetingReducer", () => {
  it("attaches to an already-active session from SESSION_STATE", () => {
    const state = liveMeetingReducer(initialLiveMeetingState, {
      type: "SERVER_EVENT",
      event: {
        type: "SESSION_STATE",
        state: "LIVE",
        sessionId,
        meetingId: "meeting-current",
        startedAt: "2026-08-25T00:00:00Z",
      },
    })

    expect(state.sessionState).toBe("live")
    expect(state.activeSessionId).toBe(sessionId)
    expect(state.activeMeetingId).toBe("meeting-current")
    expect(state.sessionStartedAt).toBe("2026-08-25T00:00:00Z")
  })

  it("replaces the current PARTIAL instead of appending", () => {
    const first = reduceEvent(startedState(), translation("PARTIAL", "Pulsars", "Pulsar"))
    const second = reduceEvent(first, translation("PARTIAL", "Pulsars are", "Pulsar là"))

    expect(second.currentPartial?.sourceText).toBe("Pulsars are")
    expect(second.recentFinals).toHaveLength(0)
  })

  it("commits a FINAL once and clears its PARTIAL", () => {
    const partial = reduceEvent(startedState(), translation("PARTIAL", "Pulsars", "Pulsar"))
    const finalEvent = translation("FINAL", "Pulsars rotate.", "Pulsar quay.")
    const committed = reduceEvent(partial, finalEvent)
    const duplicated = reduceEvent(committed, finalEvent)

    expect(committed.currentPartial).toBeNull()
    expect(committed.recentFinals).toHaveLength(1)
    expect(duplicated.recentFinals).toHaveLength(1)
  })

  it("starts a new utterance with the next PARTIAL", () => {
    const finalized = reduceEvent(startedState(), translation("FINAL", "First", "Thứ nhất"))
    const next = reduceEvent(finalized, translation("PARTIAL", "Second begins", "Phần thứ hai bắt đầu", 500))

    expect(next.recentFinals).toHaveLength(1)
    expect(next.currentPartial?.sourceText).toBe("Second begins")
  })

  it("ignores translations from stale session IDs", () => {
    const state = startedState()
    const stale = reduceEvent(state, translation("FINAL", "Old", "Cũ", 0, "old-session"))
    expect(stale).toBe(state)
  })

  it("transitions cleanly when the active session stops", () => {
    const stopped = liveMeetingReducer(startedState(), {
      type: "SERVER_EVENT",
      event: {
        type: "SESSION_STOPPED",
        sessionId,
        meetingId: "meeting-current",
        stoppedAt: "2026-08-25T00:45:00Z",
      },
    })

    expect(stopped.sessionState).toBe("stopped")
    expect(stopped.activeSessionId).toBeNull()
    expect(stopped.lastMeetingId).toBe("meeting-current")
    expect(stopped.currentPartial).toBeNull()
  })

  it("keeps only the rolling recent-final window", () => {
    let state = startedState()
    for (let index = 0; index < MAX_RECENT_FINALS + 3; index += 1) {
      state = reduceEvent(state, translation("FINAL", `source ${index}`, `dịch ${index}`, index * 500))
    }

    expect(state.recentFinals).toHaveLength(MAX_RECENT_FINALS)
    expect(state.recentFinals[0]?.sourceText).toBe("source 3")
  })

  it("keeps the visible reading context stable while paused and trims after resuming", () => {
    let state = startedState()
    for (let index = 0; index < MAX_RECENT_FINALS; index += 1) {
      state = reduceEvent(state, translation("FINAL", `source ${index}`, `dịch ${index}`, index * 500))
    }
    state = liveMeetingReducer(state, { type: "SET_FOLLOW_LIVE", followLive: false })
    for (let index = MAX_RECENT_FINALS; index < MAX_RECENT_FINALS + 3; index += 1) {
      state = reduceEvent(state, translation("FINAL", `source ${index}`, `dịch ${index}`, index * 500))
    }

    expect(state.recentFinals).toHaveLength(MAX_RECENT_FINALS + 3)
    expect(state.recentFinals[0]?.sourceText).toBe("source 0")

    const resumed = liveMeetingReducer(state, { type: "SET_FOLLOW_LIVE", followLive: true })
    expect(resumed.recentFinals).toHaveLength(MAX_RECENT_FINALS)
    expect(resumed.recentFinals[0]?.sourceText).toBe("source 3")
  })
})

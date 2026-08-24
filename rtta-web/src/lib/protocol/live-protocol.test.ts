import { describe, expect, it } from "vitest"

import { parseLiveServerEvent } from "@/lib/protocol/live-protocol"

const sessionId = "2b9c9ee0-1511-49d2-a779-d81cf7f7b441"

describe("parseLiveServerEvent", () => {
  it("parses an active SESSION_STATE snapshot", () => {
    expect(parseLiveServerEvent(JSON.stringify({
      type: "SESSION_STATE",
      state: "LIVE",
      sessionId,
      startedAt: "2026-08-25T00:00:00Z",
    }))).toEqual({
      type: "SESSION_STATE",
      state: "LIVE",
      sessionId,
      startedAt: "2026-08-25T00:00:00Z",
    })
  })

  it("parses SESSION_STARTED", () => {
    expect(parseLiveServerEvent(JSON.stringify({
      type: "SESSION_STARTED",
      sessionId,
      startedAt: "2026-08-25T00:00:00Z",
    }))).toEqual({
      type: "SESSION_STARTED",
      sessionId,
      startedAt: "2026-08-25T00:00:00Z",
    })
  })

  it("parses a valid PARTIAL", () => {
    expect(parseLiveServerEvent(JSON.stringify({
      type: "TRANSLATION",
      sessionId,
      eventType: "PARTIAL",
      sourceText: "Pulsars are",
      translatedText: "Pulsar là",
      offsetMs: 1230,
      durationMs: 760,
      observedAt: "2026-08-25T00:00:01Z",
    }))).toMatchObject({ type: "TRANSLATION", eventType: "PARTIAL", sessionId })
  })

  it("parses a valid FINAL", () => {
    expect(parseLiveServerEvent({
      type: "TRANSLATION",
      sessionId,
      eventType: "FINAL",
      sourceText: "Pulsars are rapidly rotating neutron stars.",
      translatedText: "Pulsar là các sao neutron quay nhanh.",
      offsetMs: 1230,
      durationMs: 2760,
      observedAt: "2026-08-25T00:00:03Z",
    })).toMatchObject({ type: "TRANSLATION", eventType: "FINAL" })
  })

  it("parses SESSION_STOPPED", () => {
    expect(parseLiveServerEvent(JSON.stringify({
      type: "SESSION_STOPPED",
      sessionId,
      stoppedAt: "2026-08-25T00:45:00Z",
    }))).toEqual({
      type: "SESSION_STOPPED",
      sessionId,
      stoppedAt: "2026-08-25T00:45:00Z",
    })
  })

  it.each([
    "not-json",
    JSON.stringify({ type: "TRANSLATION", sessionId, eventType: "PARTIAL" }),
    JSON.stringify({ type: "SESSION_STARTED", sessionId, startedAt: "not-a-date" }),
  ])("rejects malformed events", (payload) => {
    expect(parseLiveServerEvent(payload)).toBeNull()
  })

  it("rejects unknown events", () => {
    expect(parseLiveServerEvent(JSON.stringify({ type: "AZURE_DIAGNOSTIC", detail: "hidden" }))).toBeNull()
  })
})

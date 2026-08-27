import { describe, expect, it } from "vitest";
import {
  createStartControlMessage,
  createAuthControlMessage,
  createStopControlMessage,
  DEFAULT_BACKEND_WEBSOCKET_URL,
  parseBackendAcknowledgement,
  parseBackendTextMessage,
  resolveBackendWebSocketUrl,
} from "./protocol";

const VALID_SESSION_ID = "2b9c9ee0-1511-49d2-a779-d81cf7f7b441";

function translationJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "TRANSLATION",
    sessionId: VALID_SESSION_ID,
    eventType: "PARTIAL",
    sourceText: "Pulsars are rapidly rotating...",
    translatedText: "Pulsar là những...",
    offsetMs: 1_230,
    durationMs: 760,
    observedAt: "2026-08-25T00:00:00.000Z",
    ...overrides,
  });
}

describe("audio WebSocket protocol", () => {
  it("creates the exact S02 START metadata", () => {
    expect(createAuthControlMessage("device-secret")).toEqual({
      type: "AUTH",
      token: "device-secret",
    });
    expect(createStartControlMessage("test-session")).toEqual({
      type: "START",
      sessionId: "test-session",
      sampleRate: 16_000,
      channels: 1,
      bitsPerSample: 16,
      chunkMs: 50,
    });
  });

  it("creates a scoped STOP and parses only known acknowledgements", () => {
    expect(createStopControlMessage("test-session")).toEqual({
      type: "STOP",
      sessionId: "test-session",
    });
    expect(parseBackendAcknowledgement(" STARTED ")).toBe("STARTED");
    expect(parseBackendAcknowledgement("AUTHENTICATED")).toBe("AUTHENTICATED");
    expect(parseBackendAcknowledgement("STOPPED")).toBe("STOPPED");
    expect(parseBackendAcknowledgement("ERROR")).toBe("ERROR");
    expect(parseBackendAcknowledgement("UNKNOWN")).toBeNull();
  });

  it.each(["AUTHENTICATED", "STARTED", "STOPPED", "ERROR"] as const)(
    "parses the %s control acknowledgement",
    (acknowledgement) => {
      expect(parseBackendTextMessage(acknowledgement)).toEqual({
        kind: "acknowledgement",
        acknowledgement,
      });
    },
  );

  it.each(["PARTIAL", "FINAL"] as const)(
    "runtime-validates a %s translation event",
    (eventType) => {
      expect(
        parseBackendTextMessage(translationJson({ eventType })),
      ).toEqual({
        kind: "translation",
        event: {
          type: "TRANSLATION",
          sessionId: VALID_SESSION_ID,
          eventType,
          sourceText: "Pulsars are rapidly rotating...",
          translatedText: "Pulsar là những...",
          offsetMs: 1_230,
          durationMs: 760,
          observedAt: "2026-08-25T00:00:00.000Z",
        },
      });
    },
  );

  it("rejects malformed JSON and unknown wire message types explicitly", () => {
    expect(() => parseBackendTextMessage("{"))
      .toThrow("neither a known acknowledgement nor valid JSON");
    expect(() =>
      parseBackendTextMessage(JSON.stringify({ type: "UNKNOWN" })),
    ).toThrow("Unsupported backend JSON message type");
  });

  it.each([
    ["missing sessionId", { sessionId: undefined }],
    ["invalid sessionId", { sessionId: "not-a-uuid" }],
    ["invalid eventType", { eventType: "INTERIM" }],
    ["non-string sourceText", { sourceText: 42 }],
    ["non-string translatedText", { translatedText: false }],
    ["invalid offsetMs", { offsetMs: "1230" }],
    ["negative durationMs", { durationMs: -1 }],
    ["fractional durationMs", { durationMs: 7.5 }],
    ["invalid observedAt", { observedAt: "yesterday" }],
  ])("rejects a translation with %s", (_description, overrides) => {
    expect(() => parseBackendTextMessage(translationJson(overrides))).toThrow(
      "Malformed TRANSLATION message",
    );
  });

  it("uses a configurable WebSocket URL with a localhost default", () => {
    expect(resolveBackendWebSocketUrl(undefined)).toBe(
      DEFAULT_BACKEND_WEBSOCKET_URL,
    );
    expect(resolveBackendWebSocketUrl("wss://example.test/audio")).toBe(
      "wss://example.test/audio",
    );
    expect(() => resolveBackendWebSocketUrl("https://example.test/audio")).toThrow(
      "ws:// or wss://",
    );
  });
});

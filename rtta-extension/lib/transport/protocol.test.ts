import { describe, expect, it } from "vitest";
import {
  createStartControlMessage,
  createStopControlMessage,
  DEFAULT_BACKEND_WEBSOCKET_URL,
  parseBackendAcknowledgement,
  resolveBackendWebSocketUrl,
} from "./protocol";

describe("audio WebSocket protocol", () => {
  it("creates the exact S02 START metadata", () => {
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
    expect(parseBackendAcknowledgement("STOPPED")).toBe("STOPPED");
    expect(parseBackendAcknowledgement("ERROR")).toBe("ERROR");
    expect(parseBackendAcknowledgement("UNKNOWN")).toBeNull();
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

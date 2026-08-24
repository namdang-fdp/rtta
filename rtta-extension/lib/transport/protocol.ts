import {
  PCM_CHUNK_DURATION_MS,
  PCM_TARGET_SAMPLE_RATE,
} from "../audio/pcm";

export const DEFAULT_BACKEND_WEBSOCKET_URL =
  "ws://localhost:8080/ws/audio";

export type BackendAcknowledgement = "STARTED" | "STOPPED" | "ERROR";

export interface StartControlMessage {
  readonly type: "START";
  readonly sessionId: string;
  readonly sampleRate: 16000;
  readonly channels: 1;
  readonly bitsPerSample: 16;
  readonly chunkMs: 50;
}

export interface StopControlMessage {
  readonly type: "STOP";
  readonly sessionId: string;
}

export function createStartControlMessage(
  sessionId: string,
): StartControlMessage {
  return {
    type: "START",
    sessionId,
    sampleRate: PCM_TARGET_SAMPLE_RATE,
    channels: 1,
    bitsPerSample: 16,
    chunkMs: PCM_CHUNK_DURATION_MS,
  };
}

export function createStopControlMessage(
  sessionId: string,
): StopControlMessage {
  return { type: "STOP", sessionId };
}

export function parseBackendAcknowledgement(
  value: unknown,
): BackendAcknowledgement | null {
  if (typeof value !== "string") {
    return null;
  }

  const acknowledgement = value.trim();
  if (
    acknowledgement === "STARTED" ||
    acknowledgement === "STOPPED" ||
    acknowledgement === "ERROR"
  ) {
    return acknowledgement;
  }
  return null;
}

export function resolveBackendWebSocketUrl(value: string | undefined): string {
  const configuredUrl = value?.trim() || DEFAULT_BACKEND_WEBSOCKET_URL;
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("The backend WebSocket URL is invalid.");
  }

  if (parsedUrl.protocol !== "ws:" && parsedUrl.protocol !== "wss:") {
    throw new Error("The backend URL must use ws:// or wss://.");
  }
  if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
    throw new Error("The backend WebSocket URL must not contain credentials.");
  }

  return parsedUrl.href;
}

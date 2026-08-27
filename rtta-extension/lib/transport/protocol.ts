import {
  PCM_CHUNK_DURATION_MS,
  PCM_TARGET_SAMPLE_RATE,
} from "../audio/pcm";

export const DEFAULT_BACKEND_WEBSOCKET_URL =
  "ws://localhost:8080/ws/audio";

export type BackendAcknowledgement = "AUTHENTICATED" | "STARTED" | "STOPPED" | "ERROR";

export type TranslationEventType = "PARTIAL" | "FINAL";

export interface TranslationWireEvent {
  readonly type: "TRANSLATION";
  readonly sessionId: string;
  readonly eventType: TranslationEventType;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly offsetMs: number;
  readonly durationMs: number;
  readonly observedAt: string;
}

export type BackendTextMessage =
  | {
      readonly kind: "acknowledgement";
      readonly acknowledgement: BackendAcknowledgement;
    }
  | {
      readonly kind: "translation";
      readonly event: TranslationWireEvent;
    };

export class BackendProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendProtocolError";
  }
}

export interface StartControlMessage {
  readonly type: "START";
  readonly sessionId: string;
  readonly sampleRate: 16000;
  readonly channels: 1;
  readonly bitsPerSample: 16;
  readonly chunkMs: 50;
}

export interface AuthControlMessage {
  readonly type: "AUTH";
  readonly token: string;
}

export function createAuthControlMessage(token: string): AuthControlMessage {
  return { type: "AUTH", token };
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
    acknowledgement === "AUTHENTICATED" ||
    acknowledgement === "STARTED" ||
    acknowledgement === "STOPPED" ||
    acknowledgement === "ERROR"
  ) {
    return acknowledgement;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCanonicalUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function isTranslationWireEvent(
  value: unknown,
): value is TranslationWireEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.type === "TRANSLATION" &&
    typeof value.sessionId === "string" &&
    isCanonicalUuid(value.sessionId) &&
    (value.eventType === "PARTIAL" || value.eventType === "FINAL") &&
    typeof value.sourceText === "string" &&
    typeof value.translatedText === "string" &&
    (value.sourceText.trim().length > 0 ||
      value.translatedText.trim().length > 0) &&
    isNonNegativeSafeInteger(value.offsetMs) &&
    isNonNegativeSafeInteger(value.durationMs) &&
    isIsoTimestamp(value.observedAt)
  );
}

export function parseBackendTextMessage(value: unknown): BackendTextMessage {
  const acknowledgement = parseBackendAcknowledgement(value);
  if (acknowledgement !== null) {
    return { kind: "acknowledgement", acknowledgement };
  }
  if (typeof value !== "string") {
    throw new BackendProtocolError("Backend messages must be text frames.");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(value) as unknown;
  } catch {
    throw new BackendProtocolError(
      "Backend text is neither a known acknowledgement nor valid JSON.",
    );
  }

  if (!isRecord(decoded) || typeof decoded.type !== "string") {
    throw new BackendProtocolError("Backend JSON message type is required.");
  }
  if (decoded.type !== "TRANSLATION") {
    throw new BackendProtocolError(
      `Unsupported backend JSON message type: ${decoded.type}.`,
    );
  }
  if (!isTranslationWireEvent(decoded)) {
    throw new BackendProtocolError("Malformed TRANSLATION message.");
  }

  return { kind: "translation", event: decoded };
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

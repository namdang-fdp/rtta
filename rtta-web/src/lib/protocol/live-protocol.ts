import type {
  LiveErrorEvent,
  LiveServerEvent,
  SessionStartedEvent,
  SessionStateEvent,
  SessionStoppedEvent,
  TranslationServerEvent,
} from "@/types/live"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function parseSessionState(value: Record<string, unknown>): SessionStateEvent | null {
  if (value.state !== "IDLE" && value.state !== "LIVE") return null
  if (!isNullableString(value.sessionId)) return null
  if (value.startedAt !== null && !isIsoDate(value.startedAt)) return null
  if (value.state === "LIVE" && (!isNonEmptyString(value.sessionId) || !isIsoDate(value.startedAt))) {
    return null
  }
  if (value.state === "IDLE" && (value.sessionId !== null || value.startedAt !== null)) {
    return null
  }

  return {
    type: "SESSION_STATE",
    state: value.state,
    sessionId: value.sessionId,
    startedAt: value.startedAt,
  }
}

function parseSessionStarted(value: Record<string, unknown>): SessionStartedEvent | null {
  if (!isNonEmptyString(value.sessionId) || !isIsoDate(value.startedAt)) return null
  return {
    type: "SESSION_STARTED",
    sessionId: value.sessionId,
    startedAt: value.startedAt,
  }
}

function parseTranslation(value: Record<string, unknown>): TranslationServerEvent | null {
  if (!isNonEmptyString(value.sessionId)) return null
  if (value.eventType !== "PARTIAL" && value.eventType !== "FINAL") return null
  if (typeof value.sourceText !== "string" || typeof value.translatedText !== "string") return null
  if (!value.sourceText.trim() && !value.translatedText.trim()) return null
  if (!isNonNegativeNumber(value.offsetMs) || !isNonNegativeNumber(value.durationMs)) return null
  if (!isIsoDate(value.observedAt)) return null

  return {
    type: "TRANSLATION",
    sessionId: value.sessionId,
    eventType: value.eventType,
    sourceText: value.sourceText,
    translatedText: value.translatedText,
    offsetMs: value.offsetMs,
    durationMs: value.durationMs,
    observedAt: value.observedAt,
  }
}

function parseSessionStopped(value: Record<string, unknown>): SessionStoppedEvent | null {
  if (!isNonEmptyString(value.sessionId) || !isIsoDate(value.stoppedAt)) return null
  return {
    type: "SESSION_STOPPED",
    sessionId: value.sessionId,
    stoppedAt: value.stoppedAt,
  }
}

function parseError(value: Record<string, unknown>): LiveErrorEvent | null {
  if (!isNullableString(value.sessionId) || !isNonEmptyString(value.message)) return null
  if (!isIsoDate(value.observedAt)) return null
  return {
    type: "ERROR",
    sessionId: value.sessionId,
    message: value.message,
    observedAt: value.observedAt,
  }
}

export function parseLiveServerEvent(payload: string | unknown): LiveServerEvent | null {
  let value: unknown = payload
  if (typeof payload === "string") {
    try {
      value = JSON.parse(payload)
    } catch {
      return null
    }
  }
  if (!isRecord(value) || typeof value.type !== "string") return null

  switch (value.type) {
    case "SESSION_STATE":
      return parseSessionState(value)
    case "SESSION_STARTED":
      return parseSessionStarted(value)
    case "TRANSLATION":
      return parseTranslation(value)
    case "SESSION_STOPPED":
      return parseSessionStopped(value)
    case "ERROR":
      return parseError(value)
    default:
      return null
  }
}

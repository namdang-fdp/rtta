import type {
  TranslationEventType,
  TranslationWireEvent,
} from "../transport/protocol";

export interface TranslationSnapshot {
  readonly eventType: TranslationEventType;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly offsetMs: number;
  readonly durationMs: number;
  readonly observedAt: string;
  readonly receivedAtMs: number;
}

export function applyTranslationEvent(
  expectedSessionId: string,
  current: TranslationSnapshot | null,
  event: TranslationWireEvent,
  receivedAtMs: number,
): TranslationSnapshot | null {
  if (event.sessionId !== expectedSessionId) {
    return current;
  }

  return {
    eventType: event.eventType,
    sourceText: event.sourceText,
    translatedText: event.translatedText,
    offsetMs: event.offsetMs,
    durationMs: event.durationMs,
    observedAt: event.observedAt,
    receivedAtMs,
  };
}

export function isTranslationSnapshot(
  value: unknown,
): value is TranslationSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.eventType === "PARTIAL" || candidate.eventType === "FINAL") &&
    typeof candidate.sourceText === "string" &&
    typeof candidate.translatedText === "string" &&
    typeof candidate.offsetMs === "number" &&
    Number.isSafeInteger(candidate.offsetMs) &&
    candidate.offsetMs >= 0 &&
    typeof candidate.durationMs === "number" &&
    Number.isSafeInteger(candidate.durationMs) &&
    candidate.durationMs >= 0 &&
    typeof candidate.observedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(
      candidate.observedAt,
    ) &&
    Number.isFinite(Date.parse(candidate.observedAt)) &&
    typeof candidate.receivedAtMs === "number" &&
    Number.isFinite(candidate.receivedAtMs) &&
    candidate.receivedAtMs >= 0
  );
}

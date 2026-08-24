import { describe, expect, it } from "vitest";
import type { TranslationWireEvent } from "../transport/protocol";
import { applyTranslationEvent } from "./state";

const SESSION_ID = "2b9c9ee0-1511-49d2-a779-d81cf7f7b441";

function event(
  eventType: "PARTIAL" | "FINAL",
  sourceText: string,
  translatedText = `VI: ${sourceText}`,
  sessionId = SESSION_ID,
): TranslationWireEvent {
  return {
    type: "TRANSLATION",
    sessionId,
    eventType,
    sourceText,
    translatedText,
    offsetMs: 1_000,
    durationMs: 500,
    observedAt: "2026-08-25T00:00:00.000Z",
  };
}

describe("latest translation state", () => {
  it("replaces evolving partials instead of accumulating them", () => {
    let latest = applyTranslationEvent(
      SESSION_ID,
      null,
      event("PARTIAL", "Pulsars"),
      1,
    );
    latest = applyTranslationEvent(
      SESSION_ID,
      latest,
      event("PARTIAL", "Pulsars are"),
      2,
    );
    latest = applyTranslationEvent(
      SESSION_ID,
      latest,
      event("PARTIAL", "Pulsars are rapidly"),
      3,
    );

    expect(latest).toMatchObject({
      eventType: "PARTIAL",
      sourceText: "Pulsars are rapidly",
      translatedText: "VI: Pulsars are rapidly",
      receivedAtMs: 3,
    });
    expect(Array.isArray(latest)).toBe(false);
  });

  it("settles a partial as the final event", () => {
    const partial = applyTranslationEvent(
      SESSION_ID,
      null,
      event("PARTIAL", "Pulsars are rapidly"),
      1,
    );
    const final = applyTranslationEvent(
      SESSION_ID,
      partial,
      event(
        "FINAL",
        "Pulsars are rapidly rotating neutron stars.",
        "Pulsar là các sao neutron quay nhanh.",
      ),
      2,
    );

    expect(final).toMatchObject({
      eventType: "FINAL",
      sourceText: "Pulsars are rapidly rotating neutron stars.",
      translatedText: "Pulsar là các sao neutron quay nhanh.",
      receivedAtMs: 2,
    });
  });

  it("replaces a settled final when a new utterance partial arrives", () => {
    const utteranceA = applyTranslationEvent(
      SESSION_ID,
      null,
      event("FINAL", "Utterance A"),
      1,
    );
    const utteranceB = applyTranslationEvent(
      SESSION_ID,
      utteranceA,
      event("PARTIAL", "Utterance B"),
      2,
    );

    expect(utteranceB).toMatchObject({
      eventType: "PARTIAL",
      sourceText: "Utterance B",
    });
  });

  it("ignores an event from a stale RTTA session", () => {
    const current = applyTranslationEvent(
      SESSION_ID,
      null,
      event("FINAL", "Current session"),
      1,
    );
    const stale = applyTranslationEvent(
      SESSION_ID,
      current,
      event(
        "PARTIAL",
        "Old session text",
        "Bản dịch cũ",
        "9235b079-e32b-4774-9f27-c404f399f9e5",
      ),
      2,
    );

    expect(stale).toBe(current);
  });
});

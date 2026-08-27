import { describe, expect, it } from "vitest";
import { createBackendState } from "../transport/state";
import {
  CAPTURE_MESSAGE,
  createCaptureState,
  isCaptureRuntimeMessage,
  isCaptureResponse,
  type CaptureResponse,
} from "./messages";

describe("capture state translation synchronization", () => {
  it("accepts household auth context only on a valid offscreen start message", () => {
    expect(
      isCaptureRuntimeMessage({
        type: CAPTURE_MESSAGE.OFFSCREEN_START,
        streamId: "stream-id",
        tabId: 42,
        householdCode: "household-code",
      }),
    ).toBe(true);
    expect(
      isCaptureRuntimeMessage({
        type: CAPTURE_MESSAGE.OFFSCREEN_START,
        streamId: "stream-id",
        tabId: 42,
        householdCode: "   ",
      }),
    ).toBe(false);
  });

  it("restores the latest translation in a popup state response", () => {
    const state = createCaptureState("capturing", {
      tabId: 42,
      backend: createBackendState("connected"),
      translation: {
        eventType: "FINAL",
        sourceText: "Pulsars are rapidly rotating neutron stars.",
        translatedText: "Pulsar là các sao neutron quay nhanh.",
        offsetMs: 1_230,
        durationMs: 2_760,
        observedAt: "2026-08-25T00:00:02.760Z",
        receivedAtMs: 1_777_075_202_765,
      },
    });
    const reopenedPopupResponse: unknown = JSON.parse(
      JSON.stringify({ ok: true, state } satisfies CaptureResponse),
    );

    expect(isCaptureResponse(reopenedPopupResponse)).toBe(true);
    if (!isCaptureResponse(reopenedPopupResponse)) {
      throw new Error("Expected a valid popup state response.");
    }
    expect(reopenedPopupResponse.state.phase).toBe("capturing");
    expect(reopenedPopupResponse.state.translation).toEqual(state.translation);
  });

  it("rejects an invalid translation snapshot in synchronized state", () => {
    const invalidResponse = {
      ok: true,
      state: {
        ...createCaptureState("capturing"),
        translation: {
          eventType: "INTERIM",
          sourceText: "source",
          translatedText: "translation",
          offsetMs: 0,
          durationMs: 50,
          observedAt: "2026-08-25T00:00:00Z",
          receivedAtMs: Date.now(),
        },
      },
    };

    expect(isCaptureResponse(invalidResponse)).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_MESSAGE,
  createCaptureState,
  type CaptureResponse,
} from "./messages";
import { createBackendState } from "../transport/state";

type RuntimeListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean;

describe("background popup state recovery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns the offscreen latest translation without restarting capture", async () => {
    const offscreenState = createCaptureState("capturing", {
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
    let runtimeListener: RuntimeListener | null = null;
    const getMediaStreamId = vi.fn();
    const sendMessage = vi.fn(async (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === CAPTURE_MESSAGE.OFFSCREEN_GET_STATE
      ) {
        return { ok: true, state: offscreenState } satisfies CaptureResponse;
      }
      return undefined;
    });

    vi.stubGlobal("defineBackground", (setup: () => void) => setup());
    vi.stubGlobal("chrome", {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getContexts: vi.fn(async () => [{ contextType: "OFFSCREEN_DOCUMENT" }]),
        sendMessage,
        onMessage: {
          addListener: (listener: RuntimeListener) => {
            runtimeListener = listener;
          },
        },
      },
      offscreen: {
        createDocument: vi.fn(),
        closeDocument: vi.fn(),
      },
      tabs: {
        query: vi.fn(),
      },
      tabCapture: {
        getMediaStreamId,
      },
    });

    await import("../../entrypoints/background");
    if (runtimeListener === null) {
      throw new Error("Background runtime listener was not registered.");
    }

    const response = await new Promise<CaptureResponse>((resolve) => {
      const keepsChannelOpen = runtimeListener?.(
        { type: CAPTURE_MESSAGE.GET_STATE },
        {},
        (value) => resolve(value as CaptureResponse),
      );
      expect(keepsChannelOpen).toBe(true);
    });

    expect(response).toEqual({ ok: true, state: offscreenState });
    expect(sendMessage).toHaveBeenCalledWith({
      type: CAPTURE_MESSAGE.OFFSCREEN_GET_STATE,
    });
    expect(getMediaStreamId).not.toHaveBeenCalled();
  });
});

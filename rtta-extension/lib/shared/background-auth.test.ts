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

async function dispatch(
  listener: RuntimeListener,
  message: unknown,
): Promise<CaptureResponse> {
  return await new Promise<CaptureResponse>((resolve) => {
    expect(
      listener(message, {}, (value) => resolve(value as CaptureResponse)),
    ).toBe(true);
  });
}

describe("background household authentication ownership", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("reads local storage before capture and passes the code to offscreen", async () => {
    const calls: string[] = [];
    let runtimeListener: RuntimeListener | null = null;
    const storageGet = vi.fn(async () => {
      calls.push("storage");
      return { rttaHouseholdCode: "household-secret" };
    });
    const getMediaStreamId = vi.fn(async () => {
      calls.push("tab-capture");
      return "stream-id";
    });
    const createDocument = vi.fn(async () => {
      calls.push("offscreen-create");
    });
    let offscreenExists = false;
    const sendMessage = vi.fn(async (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === CAPTURE_MESSAGE.OFFSCREEN_START
      ) {
        calls.push("offscreen-start");
        offscreenExists = true;
        return {
          ok: true,
          state: createCaptureState("capturing", {
            tabId: 42,
            backend: createBackendState("connected"),
          }),
        } satisfies CaptureResponse;
      }
      return undefined;
    });

    vi.stubGlobal("defineBackground", (setup: () => void) => setup());
    vi.stubGlobal("chrome", {
      storage: { local: { get: storageGet } },
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getContexts: vi.fn(async () =>
          offscreenExists ? [{ contextType: "OFFSCREEN_DOCUMENT" }] : [],
        ),
        sendMessage,
        onMessage: {
          addListener: (listener: RuntimeListener) => {
            runtimeListener = listener;
          },
        },
      },
      offscreen: {
        createDocument,
        closeDocument: vi.fn(),
      },
      tabs: {
        query: vi.fn(async () => [{ id: 42, url: "https://example.com" }]),
      },
      tabCapture: { getMediaStreamId },
    });

    await import("../../entrypoints/background");
    if (runtimeListener === null) {
      throw new Error("Background runtime listener was not registered.");
    }

    const response = await dispatch(runtimeListener, {
      type: CAPTURE_MESSAGE.START,
    });

    expect(response.ok).toBe(true);
    expect(storageGet).toHaveBeenCalledWith("rttaHouseholdCode");
    expect(sendMessage).toHaveBeenCalledWith({
      type: CAPTURE_MESSAGE.OFFSCREEN_START,
      streamId: "stream-id",
      tabId: 42,
      householdCode: "household-secret",
    });
    expect(calls.indexOf("storage")).toBeLessThan(calls.indexOf("tab-capture"));
    expect(calls.indexOf("storage")).toBeLessThan(
      calls.indexOf("offscreen-create"),
    );
  });

  it("does not create a capture or offscreen document when the code is missing", async () => {
    let runtimeListener: RuntimeListener | null = null;
    const query = vi.fn();
    const getMediaStreamId = vi.fn();
    const createDocument = vi.fn();

    vi.stubGlobal("defineBackground", (setup: () => void) => setup());
    vi.stubGlobal("chrome", {
      storage: { local: { get: vi.fn(async () => ({})) } },
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getContexts: vi.fn(async () => []),
        sendMessage: vi.fn(async () => undefined),
        onMessage: {
          addListener: (listener: RuntimeListener) => {
            runtimeListener = listener;
          },
        },
      },
      offscreen: {
        createDocument,
        closeDocument: vi.fn(),
      },
      tabs: { query },
      tabCapture: { getMediaStreamId },
    });

    await import("../../entrypoints/background");
    if (runtimeListener === null) {
      throw new Error("Background runtime listener was not registered.");
    }

    const response = await dispatch(runtimeListener, {
      type: CAPTURE_MESSAGE.START,
    });

    expect(response.ok).toBe(false);
    if (response.ok) {
      throw new Error("Expected missing household code to reject capture.");
    }
    expect(response.error).toBe(
      "Chưa có mã gia đình. Hãy nhập mã để kết nối RTTA.",
    );
    expect(query).not.toHaveBeenCalled();
    expect(getMediaStreamId).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });
});

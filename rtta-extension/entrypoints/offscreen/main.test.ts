import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_MESSAGE,
  type CaptureResponse,
} from "../../lib/shared/messages";

const transportMocks = vi.hoisted(() => ({
  constructorCodes: [] as string[],
  connect: vi.fn(async () => undefined),
  stop: vi.fn(async () => undefined),
}));

vi.mock("../../lib/transport/audio-websocket", async () => {
  const { createBackendState } = await import("../../lib/transport/state");

  return {
    AudioWebSocketTransport: class {
      constructor(
        _url: string,
        _onFailure: (message: string) => void,
        _onTranslation: (...args: unknown[]) => void,
        _socketFactory: (url: string) => unknown,
        householdCode: string,
      ) {
        transportMocks.constructorCodes.push(householdCode);
      }

      connect = transportMocks.connect;
      stop = transportMocks.stop;
      closeImmediately = vi.fn();

      getState() {
        return createBackendState("connected");
      }

      sendPcm() {}
    },
  };
});

type RuntimeListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean;

function createAudioNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe("offscreen runtime authentication context", () => {
  let runtimeListener: RuntimeListener | null;

  beforeEach(() => {
    runtimeListener = null;
    transportMocks.constructorCodes.length = 0;
    vi.clearAllMocks();
    vi.resetModules();

    const track = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      stop: vi.fn(),
    };
    const stream = {
      getAudioTracks: vi.fn(() => [track]),
      getTracks: vi.fn(() => [track]),
    };

    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });
    vi.stubGlobal("chrome", {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        sendMessage: vi.fn(async () => undefined),
        onMessage: {
          addListener: (listener: RuntimeListener) => {
            runtimeListener = listener;
          },
        },
      },
    });
    vi.stubGlobal(
      "AudioContext",
      class {
        sampleRate = 48_000;
        state: AudioContextState = "running";
        destination = {};
        audioWorklet = { addModule: vi.fn(async () => undefined) };
        createMediaStreamSource = vi.fn(() => createAudioNode());
        createGain = vi.fn(() => ({
          ...createAudioNode(),
          gain: { value: 1 },
        }));
        resume = vi.fn(async () => undefined);
        close = vi.fn(async () => {
          this.state = "closed";
        });
      },
    );
    vi.stubGlobal(
      "AudioWorkletNode",
      class {
        connect = vi.fn();
        disconnect = vi.fn();
        onprocessorerror: (() => void) | null = null;
        port = {
          onmessage: null,
          postMessage: vi.fn(),
          close: vi.fn(),
        };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts from the household code in the runtime message without storage access", async () => {
    await import("./main");
    if (runtimeListener === null) {
      throw new Error("Offscreen runtime listener was not registered.");
    }

    const startResponse = await new Promise<CaptureResponse>((resolve) => {
      expect(
        runtimeListener?.(
          {
            type: CAPTURE_MESSAGE.OFFSCREEN_START,
            streamId: "stream-id",
            tabId: 42,
            householdCode: "runtime-household-code",
          },
          {},
          (response) => resolve(response as CaptureResponse),
        ),
      ).toBe(true);
    });

    expect(startResponse.ok).toBe(true);
    expect(transportMocks.constructorCodes).toEqual([
      "runtime-household-code",
    ]);
    expect("storage" in (globalThis.chrome as typeof chrome)).toBe(false);

    await new Promise<CaptureResponse>((resolve) => {
      runtimeListener?.(
        { type: CAPTURE_MESSAGE.OFFSCREEN_STOP },
        {},
        (response) => resolve(response as CaptureResponse),
      );
    });
    expect(transportMocks.stop).toHaveBeenCalledOnce();
  });
});

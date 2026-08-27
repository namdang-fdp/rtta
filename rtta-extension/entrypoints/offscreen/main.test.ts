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

const audioGraphMocks = vi.hoisted(() => ({
  contexts: [] as Array<Record<string, unknown>>,
  sourceNodes: [] as Array<ReturnType<typeof createAudioNode>>,
  gainNodes: [] as Array<ReturnType<typeof createAudioNode> & { gain: { value: number } }>,
  workletNodes: [] as Array<Record<string, unknown>>,
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

async function sendCaptureMessage(
  listener: RuntimeListener,
  message: Record<string, unknown>,
): Promise<CaptureResponse> {
  return new Promise<CaptureResponse>((resolve) => {
    listener(message, {}, (response) => resolve(response as CaptureResponse));
  });
}

describe("offscreen runtime authentication context", () => {
  let runtimeListener: RuntimeListener | null;

  beforeEach(() => {
    runtimeListener = null;
    transportMocks.constructorCodes.length = 0;
    audioGraphMocks.contexts.length = 0;
    audioGraphMocks.sourceNodes.length = 0;
    audioGraphMocks.gainNodes.length = 0;
    audioGraphMocks.workletNodes.length = 0;
    vi.clearAllMocks();
    vi.resetModules();

    const track = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      stop: vi.fn(),
      getSettings: vi.fn(() => ({ sampleRate: 48_000, channelCount: 2 })),
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
        createMediaStreamSource = vi.fn(() => {
          const node = createAudioNode();
          audioGraphMocks.sourceNodes.push(node);
          return node;
        });
        createGain = vi.fn(() => {
          const node = { ...createAudioNode(), gain: { value: 1 } };
          audioGraphMocks.gainNodes.push(node);
          return node;
        });
        resume = vi.fn(async () => undefined);
        close = vi.fn(async () => {
          this.state = "closed";
        });

        constructor() {
          audioGraphMocks.contexts.push(this as unknown as Record<string, unknown>);
        }
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

        constructor() {
          audioGraphMocks.workletNodes.push(
            this as unknown as Record<string, unknown>,
          );
        }
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

    const startResponse = await sendCaptureMessage(runtimeListener, {
      type: CAPTURE_MESSAGE.OFFSCREEN_START,
      streamId: "stream-id",
      tabId: 42,
      householdCode: "runtime-household-code",
    });

    expect(startResponse.ok).toBe(true);
    expect(transportMocks.constructorCodes).toEqual([
      "runtime-household-code",
    ]);
    expect("storage" in (globalThis.chrome as typeof chrome)).toBe(false);

    await sendCaptureMessage(runtimeListener, {
      type: CAPTURE_MESSAGE.OFFSCREEN_STOP,
    });
    expect(transportMocks.stop).toHaveBeenCalledOnce();
  });

  it("keeps exactly one audible native playback path across restart", async () => {
    await import("./main");
    if (runtimeListener === null) {
      throw new Error("Offscreen runtime listener was not registered.");
    }

    const firstStart = await sendCaptureMessage(runtimeListener, {
      type: CAPTURE_MESSAGE.OFFSCREEN_START,
      streamId: "stream-one",
      tabId: 42,
      householdCode: "runtime-household-code",
    });
    expect(firstStart.ok).toBe(true);

    const firstContext = audioGraphMocks.contexts[0] as {
      destination: unknown;
      close: ReturnType<typeof vi.fn>;
    };
    const firstSource = audioGraphMocks.sourceNodes[0]!;
    const firstGain = audioGraphMocks.gainNodes[0]!;
    const firstWorklet = audioGraphMocks.workletNodes[0] as {
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    };

    // Playback is source -> destination once. The processing node can reach the
    // destination only through a permanently zero-gain branch.
    expect(firstSource.connect).toHaveBeenCalledTimes(2);
    expect(firstSource.connect).toHaveBeenNthCalledWith(
      1,
      firstContext.destination,
    );
    expect(firstSource.connect).toHaveBeenNthCalledWith(2, firstWorklet);
    expect(firstWorklet.connect).toHaveBeenCalledOnce();
    expect(firstWorklet.connect).toHaveBeenCalledWith(firstGain);
    expect(firstGain.gain.value).toBe(0);
    expect(firstGain.connect).toHaveBeenCalledOnce();
    expect(firstGain.connect).toHaveBeenCalledWith(firstContext.destination);

    const firstStop = await sendCaptureMessage(runtimeListener, {
      type: CAPTURE_MESSAGE.OFFSCREEN_STOP,
    });
    expect(firstStop.ok).toBe(true);
    expect(firstSource.disconnect).toHaveBeenCalledOnce();
    expect(firstWorklet.disconnect).toHaveBeenCalledOnce();
    expect(firstGain.disconnect).toHaveBeenCalledOnce();
    expect(firstContext.close).toHaveBeenCalledOnce();

    const secondStart = await sendCaptureMessage(runtimeListener, {
      type: CAPTURE_MESSAGE.OFFSCREEN_START,
      streamId: "stream-two",
      tabId: 42,
      householdCode: "runtime-household-code",
    });
    expect(secondStart.ok).toBe(true);
    expect(audioGraphMocks.contexts).toHaveLength(2);
    expect(audioGraphMocks.sourceNodes).toHaveLength(2);
    expect(audioGraphMocks.gainNodes).toHaveLength(2);
    expect(firstSource.connect).toHaveBeenCalledTimes(2);

    const secondContext = audioGraphMocks.contexts[1] as {
      destination: unknown;
    };
    const secondSource = audioGraphMocks.sourceNodes[1]!;
    const secondGain = audioGraphMocks.gainNodes[1]!;
    expect(secondSource.connect).toHaveBeenNthCalledWith(
      1,
      secondContext.destination,
    );
    expect(secondGain.gain.value).toBe(0);
  });
});

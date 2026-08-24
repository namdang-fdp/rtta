import {
  CaptureMetricsAccumulator,
  formatCaptureDiagnostics,
  type CaptureMetrics,
} from "../../lib/audio/metrics";
import {
  PCM_CHUNK_DURATION_MS,
  PCM_TARGET_SAMPLE_RATE,
  PCM_WORKLET_PROCESSOR_NAME,
} from "../../lib/audio/pcm";
import {
  CAPTURE_MESSAGE,
  createCaptureState,
  errorMessage,
  isCaptureRuntimeMessage,
  type CaptureResponse,
  type CaptureRuntimeMessage,
  type CaptureState,
} from "../../lib/shared/messages";

interface ChromeTabAudioConstraints extends MediaTrackConstraints {
  readonly mandatory: {
    readonly chromeMediaSource: "tab";
    readonly chromeMediaSourceId: string;
  };
}

interface PcmChunkMessage {
  readonly type: "pcm-chunk";
  readonly sequence: number;
  readonly pcm: ArrayBuffer;
  readonly level: number;
  readonly emittedAtMs: number;
}

interface CaptureSession {
  readonly tabId: number;
  readonly stream: MediaStream;
  readonly audioContext: AudioContext;
  readonly sourceNode: MediaStreamAudioSourceNode;
  readonly workletNode: AudioWorkletNode;
  readonly silentGainNode: GainNode;
  readonly metrics: CaptureMetricsAccumulator;
  readonly trackEndHandlers: ReadonlyMap<MediaStreamTrack, () => void>;
  diagnosticsTimer: number;
  endingIntentionally: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPcmChunkMessage(value: unknown): value is PcmChunkMessage {
  return (
    isRecord(value) &&
    value.type === "pcm-chunk" &&
    typeof value.sequence === "number" &&
    value.pcm instanceof ArrayBuffer &&
    typeof value.level === "number" &&
    typeof value.emittedAtMs === "number"
  );
}

function attemptCleanup(action: () => void, errors: unknown[]): void {
  try {
    action();
  } catch (error) {
    errors.push(error);
  }
}

class OffscreenCaptureController {
  private state: CaptureState = createCaptureState("ready");
  private session: CaptureSession | null = null;

  getState(): CaptureState {
    if (this.session === null || this.state.phase !== "capturing") {
      return this.state;
    }

    return createCaptureState("capturing", {
      tabId: this.session.tabId,
      metrics: this.session.metrics.snapshot(performance.now()),
    });
  }

  async start(streamId: string, tabId: number): Promise<CaptureResponse> {
    if (
      this.session !== null ||
      this.state.phase === "starting" ||
      this.state.phase === "capturing" ||
      this.state.phase === "stopping"
    ) {
      const message = "Capture is already running in the offscreen context.";
      return { ok: false, state: this.getState(), error: message };
    }

    this.setState(createCaptureState("starting", { tabId }));

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let workletNode: AudioWorkletNode | null = null;
    let silentGainNode: GainNode | null = null;

    try {
      const audioConstraints: ChromeTabAudioConstraints = {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      };

      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("The captured tab did not provide an audio track.");
      }

      audioContext = new AudioContext({ latencyHint: "interactive" });
      await audioContext.audioWorklet.addModule(
        chrome.runtime.getURL("audio-worklet.js"),
      );

      sourceNode = audioContext.createMediaStreamSource(stream);
      workletNode = new AudioWorkletNode(
        audioContext,
        PCM_WORKLET_PROCESSOR_NAME,
        {
          channelCount: 2,
          channelCountMode: "max",
          channelInterpretation: "speakers",
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        },
      );
      silentGainNode = audioContext.createGain();
      silentGainNode.gain.value = 0;

      const metrics = new CaptureMetricsAccumulator(
        audioContext.sampleRate,
        PCM_TARGET_SAMPLE_RATE,
        PCM_CHUNK_DURATION_MS,
        performance.now(),
      );

      workletNode.port.onmessage = (event: MessageEvent<unknown>) => {
        if (!isPcmChunkMessage(event.data)) {
          return;
        }

        metrics.recordChunk({
          sequence: event.data.sequence,
          byteLength: event.data.pcm.byteLength,
          level: event.data.level,
          emittedAtMs: event.data.emittedAtMs,
          observedAtMs: performance.now(),
        });
      };

      // tabCapture suppresses normal tab playback. This direct branch restores it.
      sourceNode.connect(audioContext.destination);

      // The silent destination branch keeps the worklet in the rendered graph.
      sourceNode.connect(workletNode);
      workletNode.connect(silentGainNode);
      silentGainNode.connect(audioContext.destination);

      await audioContext.resume();
      if (audioContext.state !== "running") {
        throw new Error("The tab audio context could not be started.");
      }

      const trackEndHandlers = new Map<MediaStreamTrack, () => void>();

      const session: CaptureSession = {
        tabId,
        stream,
        audioContext,
        sourceNode,
        workletNode,
        silentGainNode,
        metrics,
        trackEndHandlers,
        diagnosticsTimer: 0,
        endingIntentionally: false,
      };
      this.session = session;

      workletNode.onprocessorerror = () => {
        void this.handleUnexpectedEnd(
          session,
          "The AudioWorklet processor stopped unexpectedly.",
        );
      };

      for (const track of audioTracks) {
        const handleEnded = () => {
          void this.handleUnexpectedEnd(
            session,
            "The captured tab audio stream ended unexpectedly.",
          );
        };
        trackEndHandlers.set(track, handleEnded);
        track.addEventListener("ended", handleEnded, { once: true });
      }

      session.diagnosticsTimer = window.setInterval(() => {
        this.publishDiagnostics(session);
      }, 1_000);

      this.setState(
        createCaptureState("capturing", {
          tabId,
          metrics: metrics.snapshot(performance.now()),
        }),
      );

      return { ok: true, state: this.state };
    } catch (error) {
      await this.disposePartialResources({
        stream,
        audioContext,
        sourceNode,
        workletNode,
        silentGainNode,
      });
      this.session = null;

      const message = errorMessage(
        error,
        "Unable to initialize tab audio processing.",
      );
      this.setState(createCaptureState("error", { error: message }));
      return { ok: false, state: this.state, error: message };
    }
  }

  async stop(): Promise<CaptureResponse> {
    if (this.session === null) {
      this.setState(createCaptureState("ready"));
      return { ok: true, state: this.state };
    }

    const session = this.session;
    this.setState(
      createCaptureState("stopping", {
        tabId: session.tabId,
        metrics: session.metrics.snapshot(performance.now()),
      }),
    );

    try {
      await this.disposeSession(session);
      this.session = null;
      this.setState(createCaptureState("ready"));
      return { ok: true, state: this.state };
    } catch (error) {
      this.session = null;
      const message = errorMessage(error, "Unable to cleanly stop capture.");
      this.setState(createCaptureState("error", { error: message }));
      return { ok: false, state: this.state, error: message };
    }
  }

  private publishDiagnostics(session: CaptureSession): void {
    if (this.session !== session || this.state.phase !== "capturing") {
      return;
    }

    const metrics = session.metrics.snapshot(performance.now());
    console.info(formatCaptureDiagnostics(metrics));
    this.setState(
      createCaptureState("capturing", {
        tabId: session.tabId,
        metrics,
      }),
    );
  }

  private async handleUnexpectedEnd(
    session: CaptureSession,
    message: string,
  ): Promise<void> {
    if (this.session !== session || session.endingIntentionally) {
      return;
    }

    const finalMetrics = session.metrics.snapshot(performance.now());
    try {
      await this.disposeSession(session);
    } catch (error) {
      console.warn(
        "[RTTA] Capture ended and cleanup reported an error:",
        errorMessage(error, "Unknown cleanup error."),
      );
    }
    this.session = null;
    this.setState(
      createCaptureState("error", {
        metrics: finalMetrics,
        error: message,
      }),
    );
  }

  private async disposeSession(session: CaptureSession): Promise<void> {
    const cleanupErrors: unknown[] = [];
    session.endingIntentionally = true;
    window.clearInterval(session.diagnosticsTimer);

    for (const [track, handler] of session.trackEndHandlers) {
      attemptCleanup(
        () => track.removeEventListener("ended", handler),
        cleanupErrors,
      );
    }

    session.workletNode.onprocessorerror = null;
    session.workletNode.port.onmessage = null;
    attemptCleanup(
      () => session.workletNode.port.postMessage({ type: "stop" }),
      cleanupErrors,
    );
    attemptCleanup(() => session.workletNode.port.close(), cleanupErrors);

    attemptCleanup(() => session.sourceNode.disconnect(), cleanupErrors);
    attemptCleanup(() => session.workletNode.disconnect(), cleanupErrors);
    attemptCleanup(() => session.silentGainNode.disconnect(), cleanupErrors);

    for (const track of session.stream.getTracks()) {
      attemptCleanup(() => track.stop(), cleanupErrors);
    }

    if (session.audioContext.state !== "closed") {
      try {
        await session.audioContext.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (cleanupErrors.length > 0) {
      throw new Error(
        errorMessage(cleanupErrors[0], "One or more audio resources did not close."),
      );
    }
  }

  private async disposePartialResources(resources: {
    readonly stream: MediaStream | null;
    readonly audioContext: AudioContext | null;
    readonly sourceNode: MediaStreamAudioSourceNode | null;
    readonly workletNode: AudioWorkletNode | null;
    readonly silentGainNode: GainNode | null;
  }): Promise<void> {
    const cleanupErrors: unknown[] = [];
    attemptCleanup(
      () => resources.workletNode?.port.postMessage({ type: "stop" }),
      cleanupErrors,
    );
    attemptCleanup(() => resources.workletNode?.port.close(), cleanupErrors);
    attemptCleanup(() => resources.sourceNode?.disconnect(), cleanupErrors);
    attemptCleanup(() => resources.workletNode?.disconnect(), cleanupErrors);
    attemptCleanup(() => resources.silentGainNode?.disconnect(), cleanupErrors);

    for (const track of resources.stream?.getTracks() ?? []) {
      attemptCleanup(() => track.stop(), cleanupErrors);
    }

    if (
      resources.audioContext !== null &&
      resources.audioContext.state !== "closed"
    ) {
      try {
        await resources.audioContext.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (cleanupErrors.length > 0) {
      console.warn(
        "[RTTA] Partial audio cleanup reported an error:",
        errorMessage(cleanupErrors[0], "Unknown cleanup error."),
      );
    }
  }

  private setState(state: CaptureState): void {
    this.state = state;
    void this.publishState(state);
  }

  private async publishState(state: CaptureState): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: CAPTURE_MESSAGE.OFFSCREEN_STATE_CHANGED,
        state,
      } satisfies CaptureRuntimeMessage);
    } catch (error) {
      console.warn(
        "[RTTA] Unable to publish capture state:",
        errorMessage(error, "Unknown messaging error."),
      );
    }
  }
}

const captureController = new OffscreenCaptureController();

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (!isCaptureRuntimeMessage(message)) {
      return false;
    }

    switch (message.type) {
      case CAPTURE_MESSAGE.OFFSCREEN_START:
        void captureController
          .start(message.streamId, message.tabId)
          .then(sendResponse);
        return true;
      case CAPTURE_MESSAGE.OFFSCREEN_STOP:
        void captureController.stop().then(sendResponse);
        return true;
      case CAPTURE_MESSAGE.OFFSCREEN_GET_STATE:
        sendResponse({
          ok: true,
          state: captureController.getState(),
        } satisfies CaptureResponse);
        return false;
      default:
        return false;
    }
  },
);

console.info("[RTTA] Offscreen context ready.");

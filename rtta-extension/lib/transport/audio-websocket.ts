import { PCM_BYTES_PER_CHUNK } from "../audio/pcm";
import { errorMessage } from "../shared/messages";
import { assessBackpressure } from "./backpressure";
import {
  createAuthControlMessage,
  createStartControlMessage,
  createStopControlMessage,
  parseBackendTextMessage,
  type TranslationWireEvent,
} from "./protocol";
import {
  createBackendState,
  type BackendState,
} from "./state";

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const CONNECT_TIMEOUT_MS = 5_000;
const STOP_ACK_TIMEOUT_MS = 1_000;

interface AudioWebSocketLike {
  binaryType: BinaryType;
  readonly readyState: number;
  readonly bufferedAmount: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
}

export type AudioWebSocketFactory = (url: string) => AudioWebSocketLike;
export type UnexpectedTransportFailureHandler = (message: string) => void;
export type TranslationEventHandler = (
  event: TranslationWireEvent,
  receivedAtMs: number,
) => void;

export class AudioWebSocketTransport {
  private socket: AudioWebSocketLike | null = null;
  private state = createBackendState("disconnected");
  private sessionId: string | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((reason: Error) => void) | null = null;
  private stopResolve: (() => void) | null = null;
  private connectTimer: number | null = null;
  private stopTimer: number | null = null;
  private warningActive = false;
  private unexpectedFailureReported = false;
  private authenticated = false;

  constructor(
    private readonly url: string,
    private readonly onUnexpectedFailure: UnexpectedTransportFailureHandler,
    private readonly onTranslationEvent: TranslationEventHandler = () =>
      undefined,
    private readonly socketFactory: AudioWebSocketFactory = (socketUrl) =>
      new WebSocket(socketUrl),
    private readonly householdCode = "",
  ) {}

  getState(): BackendState {
    return createBackendState(
      this.state.phase,
      this.socket?.bufferedAmount ?? this.state.bufferedBytes,
    );
  }

  async connect(sessionId: string): Promise<void> {
    if (this.state.phase !== "disconnected") {
      throw new Error("The backend transport is already active.");
    }

    this.sessionId = sessionId;
    this.state = createBackendState("connecting");
    this.warningActive = false;
    this.unexpectedFailureReported = false;
    this.authenticated = false;

    let socket: AudioWebSocketLike;
    try {
      socket = this.socketFactory(this.url);
    } catch (error) {
      this.state = createBackendState("error");
      throw new Error(
        errorMessage(error, "Unable to create the backend WebSocket."),
      );
    }

    this.socket = socket;
    socket.binaryType = "arraybuffer";
    this.bindSocket(socket);

    await new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      this.connectTimer = window.setTimeout(() => {
        this.rejectConnect("Timed out waiting for backend STARTED acknowledgement.");
      }, CONNECT_TIMEOUT_MS);
    });
  }

  sendPcm(pcm: ArrayBuffer): void {
    const socket = this.socket;
    if (
      this.state.phase !== "connected" ||
      socket === null ||
      socket.readyState !== SOCKET_OPEN
    ) {
      const message = "The backend WebSocket is not connected.";
      this.reportUnexpectedFailure(message);
      throw new Error(message);
    }
    if (pcm.byteLength !== PCM_BYTES_PER_CHUNK) {
      const message = `Unexpected PCM chunk size: ${pcm.byteLength} bytes.`;
      this.reportUnexpectedFailure(message);
      throw new Error(message);
    }

    const backpressure = assessBackpressure(socket.bufferedAmount);
    this.state = createBackendState("connected", backpressure.bufferedBytes);

    if (backpressure.level === "error") {
      const message =
        "Backend transport buffering exceeded 32 KB; streaming was stopped.";
      this.reportUnexpectedFailure(message);
      throw new Error(message);
    }

    if (backpressure.level === "warning" && !this.warningActive) {
      this.warningActive = true;
      console.warn(
        `[RTTA] Backend transport buffering is high (${backpressure.bufferedBytes} bytes).`,
      );
    } else if (backpressure.level === "healthy") {
      this.warningActive = false;
    }

    try {
      socket.send(pcm);
    } catch (error) {
      const message = errorMessage(error, "Unable to send PCM to the backend.");
      this.reportUnexpectedFailure(message);
      throw new Error(message);
    }
  }

  async stop(): Promise<void> {
    const socket = this.socket;
    const sessionId = this.sessionId;

    if (socket === null || this.state.phase === "disconnected") {
      this.closeImmediately();
      return;
    }
    if (
      this.state.phase !== "connected" ||
      socket.readyState !== SOCKET_OPEN ||
      sessionId === null
    ) {
      this.closeImmediately();
      return;
    }

    this.state = createBackendState("stopping", socket.bufferedAmount);

    await new Promise<void>((resolve) => {
      this.stopResolve = resolve;
      this.stopTimer = window.setTimeout(() => {
        this.completeStop();
      }, STOP_ACK_TIMEOUT_MS);

      try {
        socket.send(JSON.stringify(createStopControlMessage(sessionId)));
      } catch {
        this.completeStop();
      }
    });
  }

  closeImmediately(): void {
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    this.sessionId = null;
    this.authenticated = false;
    this.state = createBackendState("disconnected");
    this.settleConnect(new Error("Backend connection was closed."));
    this.settleStop();

    if (socket !== null) {
      this.unbindSocket(socket);
      if (
        socket.readyState === SOCKET_CONNECTING ||
        socket.readyState === SOCKET_OPEN
      ) {
        socket.close(1000, "RTTA cleanup");
      }
    }
  }

  private bindSocket(socket: AudioWebSocketLike): void {
    socket.onopen = () => {
      if (this.socket !== socket || this.state.phase !== "connecting") {
        return;
      }

      try {
        socket.send(JSON.stringify(createAuthControlMessage(this.householdCode)));
      } catch (error) {
        this.rejectConnect(
          errorMessage(error, "Unable to authenticate with the RTTA backend."),
        );
      }
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) {
        return;
      }

      let message;
      try {
        message = parseBackendTextMessage(event.data);
      } catch (error) {
        const detail = errorMessage(error, "Invalid backend message.");
        if (this.state.phase === "connecting") {
          this.rejectConnect(`The backend returned an invalid message: ${detail}`);
        } else {
          this.reportUnexpectedFailure(
            `The backend returned an invalid message: ${detail}`,
          );
        }
        return;
      }

      if (message.kind === "translation") {
        if (
          this.state.phase !== "connected" &&
          this.state.phase !== "stopping"
        ) {
          this.rejectConnect(
            "The backend returned a translation before STARTED.",
          );
          return;
        }

        try {
          this.onTranslationEvent(message.event, Date.now());
        } catch (error) {
          this.reportUnexpectedFailure(
            errorMessage(error, "Unable to process a backend translation."),
          );
        }
        return;
      }

      const acknowledgement = message.acknowledgement;
      if (acknowledgement === "AUTHENTICATED" && this.state.phase === "connecting") {
        this.authenticated = true;
        try {
          socket.send(JSON.stringify(createStartControlMessage(this.sessionId ?? "")));
        } catch (error) {
          this.rejectConnect(errorMessage(error, "Unable to send START to the backend."));
        }
        return;
      }
      if (acknowledgement === "STARTED" && this.state.phase === "connecting") {
        this.clearConnectTimer();
        this.state = createBackendState("connected", socket.bufferedAmount);
        this.settleConnect();
        return;
      }
      if (acknowledgement === "STOPPED" && this.state.phase === "stopping") {
        this.requestNormalClose(socket);
        return;
      }
      if (acknowledgement === "ERROR") {
        if (this.state.phase === "connecting") {
          this.rejectConnect(
            this.authenticated
              ? "The backend rejected START."
              : "Mã gia đình không đúng. Chọn Đổi mã gia đình để thử lại.",
          );
        } else if (this.state.phase === "stopping") {
          this.completeStop();
        } else {
          this.reportUnexpectedFailure("The backend rejected the audio stream.");
        }
        return;
      }

      if (this.state.phase === "connecting") {
        this.rejectConnect("The backend returned an unexpected acknowledgement.");
      } else {
        this.reportUnexpectedFailure(
          "The backend returned an unexpected acknowledgement.",
        );
      }
    };

    socket.onerror = () => {
      if (this.socket !== socket) {
        return;
      }
      if (this.state.phase === "connecting") {
        this.rejectConnect("Unable to connect to the local RTTA backend.");
      } else if (this.state.phase === "connected") {
        this.reportUnexpectedFailure("The backend WebSocket failed.");
      } else if (this.state.phase === "stopping") {
        this.completeStop();
      }
    };

    socket.onclose = (event) => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      if (this.state.phase === "connecting") {
        this.rejectConnect("The backend closed before streaming started.");
      } else if (this.state.phase === "stopping") {
        this.state = createBackendState("disconnected");
        this.sessionId = null;
        this.settleStop();
      } else if (this.state.phase === "connected") {
        const detail = event.reason.trim();
        this.reportUnexpectedFailure(
          detail.length > 0
            ? `Backend disconnected: ${detail}`
            : "Backend disconnected unexpectedly.",
        );
      }
    };
  }

  private rejectConnect(message: string): void {
    if (this.state.phase !== "connecting") {
      return;
    }

    this.clearConnectTimer();
    this.authenticated = false;
    this.state = createBackendState("error");
    this.settleConnect(new Error(message));

    const socket = this.socket;
    if (
      socket !== null &&
      (socket.readyState === SOCKET_CONNECTING ||
        socket.readyState === SOCKET_OPEN)
    ) {
      socket.close(1000, "START failed");
    }
  }

  private reportUnexpectedFailure(message: string): void {
    if (this.unexpectedFailureReported) {
      return;
    }

    const wasStopping = this.state.phase === "stopping";
    this.unexpectedFailureReported = true;
    this.clearTimers();
    this.state = createBackendState(
      "error",
      this.socket?.bufferedAmount ?? 0,
    );
    this.onUnexpectedFailure(message);

    const socket = this.socket;
    if (socket !== null && socket.readyState === SOCKET_OPEN) {
      socket.close(1011, "RTTA transport failure");
    }
    if (wasStopping) {
      this.settleStop();
    }
  }

  private requestNormalClose(socket: AudioWebSocketLike): void {
    if (socket.readyState === SOCKET_OPEN) {
      socket.close(1000, "RTTA session stopped");
    } else {
      this.completeStop();
    }
  }

  private completeStop(): void {
    const socket = this.socket;
    this.clearStopTimer();
    this.socket = null;
    this.sessionId = null;
    this.state = createBackendState("disconnected");

    if (socket !== null) {
      this.unbindSocket(socket);
      if (
        socket.readyState === SOCKET_CONNECTING ||
        socket.readyState === SOCKET_OPEN
      ) {
        socket.close(1000, "RTTA session stopped");
      }
    }
    this.settleStop();
  }

  private settleConnect(error?: Error): void {
    const resolve = this.connectResolve;
    const reject = this.connectReject;
    this.connectResolve = null;
    this.connectReject = null;

    if (error === undefined) {
      resolve?.();
    } else {
      reject?.(error);
    }
  }

  private settleStop(): void {
    const resolve = this.stopResolve;
    this.stopResolve = null;
    resolve?.();
  }

  private clearTimers(): void {
    this.clearConnectTimer();
    this.clearStopTimer();
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private clearStopTimer(): void {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
  }

  private unbindSocket(socket: AudioWebSocketLike): void {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  }
}

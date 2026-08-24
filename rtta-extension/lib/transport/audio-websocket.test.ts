import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioWebSocketTransport } from "./audio-websocket";

class FakeWebSocket {
  binaryType: BinaryType = "blob";
  readyState = 0;
  bufferedAmount = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readonly sent: (string | ArrayBuffer)[] = [];
  readonly closeCalls: { code?: number; reason?: string }[] = [];

  send(data: string | ArrayBuffer): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = 2;
    this.closeCalls.push({ code, reason });
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  message(data: string): void {
    this.onmessage?.({ data } as MessageEvent<unknown>);
  }

  finishClose(reason = ""): void {
    this.readyState = 3;
    this.onclose?.({ reason } as CloseEvent);
  }
}

describe("AudioWebSocketTransport", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("transitions through connect, stream, STOP acknowledgement, and close", async () => {
    const socket = new FakeWebSocket();
    const failures: string[] = [];
    const transport = new AudioWebSocketTransport(
      "ws://localhost:8080/ws/audio",
      (message) => failures.push(message),
      () => socket,
    );

    const connecting = transport.connect("2b9c9ee0-1511-49d2-a779-d81cf7f7b441");
    expect(transport.getState().phase).toBe("connecting");
    socket.open();
    expect(JSON.parse(socket.sent[0] as string)).toMatchObject({
      type: "START",
      sampleRate: 16_000,
      channels: 1,
      bitsPerSample: 16,
      chunkMs: 50,
    });

    socket.message("STARTED");
    await connecting;
    expect(transport.getState().phase).toBe("connected");

    const pcm = new ArrayBuffer(1_600);
    transport.sendPcm(pcm);
    expect(socket.sent[1]).toBe(pcm);

    const stopping = transport.stop();
    expect(transport.getState().phase).toBe("stopping");
    expect(JSON.parse(socket.sent[2] as string)).toEqual({
      type: "STOP",
      sessionId: "2b9c9ee0-1511-49d2-a779-d81cf7f7b441",
    });
    socket.message("STOPPED");
    socket.finishClose();
    await stopping;

    expect(transport.getState()).toEqual({
      phase: "disconnected",
      bufferedBytes: 0,
    });
    expect(failures).toEqual([]);
  });

  it("surfaces an unexpected backend disconnect once", async () => {
    const socket = new FakeWebSocket();
    const failures: string[] = [];
    const transport = new AudioWebSocketTransport(
      "ws://localhost:8080/ws/audio",
      (message) => failures.push(message),
      () => socket,
    );

    const connecting = transport.connect("2b9c9ee0-1511-49d2-a779-d81cf7f7b441");
    socket.open();
    socket.message("STARTED");
    await connecting;
    socket.finishClose("server stopped");

    expect(transport.getState().phase).toBe("error");
    expect(failures).toEqual(["Backend disconnected: server stopped"]);
  });

  it("stops instead of adding PCM when the high-water mark is reached", async () => {
    const socket = new FakeWebSocket();
    const failures: string[] = [];
    const transport = new AudioWebSocketTransport(
      "ws://localhost:8080/ws/audio",
      (message) => failures.push(message),
      () => socket,
    );

    const connecting = transport.connect("2b9c9ee0-1511-49d2-a779-d81cf7f7b441");
    socket.open();
    socket.message("STARTED");
    await connecting;
    socket.bufferedAmount = 32_000;

    expect(() => transport.sendPcm(new ArrayBuffer(1_600))).toThrow(
      "buffering exceeded 32 KB",
    );
    expect(socket.sent).toHaveLength(1);
    expect(transport.getState().phase).toBe("error");
    expect(failures).toHaveLength(1);
  });
});

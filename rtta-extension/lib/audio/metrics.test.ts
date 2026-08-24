import { describe, expect, it } from "vitest";
import {
  CaptureMetricsAccumulator,
  formatCaptureDiagnostics,
} from "./metrics";

describe("CaptureMetricsAccumulator", () => {
  it("tracks byte rate, chunk timing, jitter, and level", () => {
    const metrics = new CaptureMetricsAccumulator(48_000, 16_000, 50, 1_000);

    metrics.recordChunk({
      sequence: 0,
      byteLength: 1_600,
      level: 0.25,
      emittedAtMs: 50,
      observedAtMs: 1_050,
    });
    const snapshot = metrics.recordChunk({
      sequence: 1,
      byteLength: 1_600,
      level: 0.5,
      emittedAtMs: 101,
      observedAtMs: 1_100,
    });

    expect(snapshot.totalChunks).toBe(2);
    expect(snapshot.totalBytes).toBe(3_200);
    expect(snapshot.averageChunkBytes).toBe(1_600);
    expect(snapshot.bytesPerSecond).toBe(32_000);
    expect(snapshot.averageIntervalMs).toBe(51);
    expect(snapshot.jitterMs).toBe(1);
    expect(snapshot.level).toBe(0.5);
  });

  it("counts missing and out-of-order sequences", () => {
    const metrics = new CaptureMetricsAccumulator(48_000, 16_000, 50, 0);

    metrics.recordChunk({
      sequence: 0,
      byteLength: 1_600,
      level: 0,
      emittedAtMs: 50,
      observedAtMs: 50,
    });
    metrics.recordChunk({
      sequence: 2,
      byteLength: 1_600,
      level: 0,
      emittedAtMs: 100,
      observedAtMs: 100,
    });
    const snapshot = metrics.recordChunk({
      sequence: 1,
      byteLength: 1_600,
      level: 0,
      emittedAtMs: 150,
      observedAtMs: 150,
    });

    expect(snapshot.droppedChunks).toBe(1);
    expect(snapshot.outOfOrderChunks).toBe(1);
  });

  it("formats concise periodic diagnostics", () => {
    const metrics = new CaptureMetricsAccumulator(48_000, 16_000, 50, 0);
    const snapshot = metrics.recordChunk({
      sequence: 0,
      byteLength: 1_600,
      level: 0.17,
      emittedAtMs: 50,
      observedAtMs: 50,
    });

    expect(formatCaptureDiagnostics(snapshot)).toContain(
      "RTTA CAPTURE sourceRate=48000 targetRate=16000",
    );
    expect(formatCaptureDiagnostics(snapshot)).toContain("avgChunk=1600");
  });
});

export interface CaptureMetrics {
  readonly sequence: number;
  readonly chunkBytes: number;
  readonly totalBytes: number;
  readonly totalChunks: number;
  readonly elapsedMs: number;
  readonly intervalMs: number;
  readonly averageIntervalMs: number;
  readonly jitterMs: number;
  readonly averageChunkBytes: number;
  readonly bytesPerSecond: number;
  readonly sourceSampleRate: number;
  readonly targetSampleRate: number;
  readonly level: number;
  readonly droppedChunks: number;
  readonly outOfOrderChunks: number;
}

export interface PcmChunkObservation {
  readonly sequence: number;
  readonly byteLength: number;
  readonly level: number;
  readonly emittedAtMs: number;
  readonly observedAtMs: number;
}

export class CaptureMetricsAccumulator {
  private sequence = -1;
  private chunkBytes = 0;
  private totalBytes = 0;
  private totalChunks = 0;
  private latestLevel = 0;
  private latestIntervalMs = 0;
  private totalIntervalMs = 0;
  private totalJitterMs = 0;
  private intervalCount = 0;
  private previousEmittedAtMs: number | null = null;
  private expectedSequence = 0;
  private droppedChunks = 0;
  private outOfOrderChunks = 0;

  constructor(
    readonly sourceSampleRate: number,
    readonly targetSampleRate: number,
    readonly targetChunkDurationMs: number,
    private readonly startedAtMs: number,
  ) {}

  recordChunk(observation: PcmChunkObservation): CaptureMetrics {
    this.trackSequence(observation.sequence);
    this.sequence = observation.sequence;
    this.chunkBytes = observation.byteLength;
    this.totalBytes += observation.byteLength;
    this.totalChunks += 1;
    this.latestLevel = Math.max(0, Math.min(1, observation.level));

    if (this.previousEmittedAtMs !== null) {
      this.latestIntervalMs = Math.max(
        0,
        observation.emittedAtMs - this.previousEmittedAtMs,
      );
      this.totalIntervalMs += this.latestIntervalMs;
      this.totalJitterMs += Math.abs(
        this.latestIntervalMs - this.targetChunkDurationMs,
      );
      this.intervalCount += 1;
    }

    this.previousEmittedAtMs = observation.emittedAtMs;
    return this.snapshot(observation.observedAtMs);
  }

  snapshot(observedAtMs: number): CaptureMetrics {
    const elapsedMs = Math.max(0, observedAtMs - this.startedAtMs);

    return {
      sequence: this.sequence,
      chunkBytes: this.chunkBytes,
      totalBytes: this.totalBytes,
      totalChunks: this.totalChunks,
      elapsedMs,
      intervalMs: this.latestIntervalMs,
      averageIntervalMs:
        this.intervalCount === 0 ? 0 : this.totalIntervalMs / this.intervalCount,
      jitterMs:
        this.intervalCount === 0 ? 0 : this.totalJitterMs / this.intervalCount,
      averageChunkBytes:
        this.totalChunks === 0 ? 0 : this.totalBytes / this.totalChunks,
      bytesPerSecond: elapsedMs === 0 ? 0 : this.totalBytes / (elapsedMs / 1_000),
      sourceSampleRate: this.sourceSampleRate,
      targetSampleRate: this.targetSampleRate,
      level: this.latestLevel,
      droppedChunks: this.droppedChunks,
      outOfOrderChunks: this.outOfOrderChunks,
    };
  }

  private trackSequence(sequence: number): void {
    if (sequence === this.expectedSequence) {
      this.expectedSequence += 1;
      return;
    }

    if (sequence > this.expectedSequence) {
      this.droppedChunks += sequence - this.expectedSequence;
      this.expectedSequence = sequence + 1;
      return;
    }

    this.outOfOrderChunks += 1;
  }
}

export function formatCaptureDiagnostics(metrics: CaptureMetrics): string {
  return [
    "RTTA CAPTURE",
    `sourceRate=${metrics.sourceSampleRate}`,
    `targetRate=${metrics.targetSampleRate}`,
    `chunks=${metrics.totalChunks}`,
    `bytesPerSec=${Math.round(metrics.bytesPerSecond)}`,
    `avgChunk=${Math.round(metrics.averageChunkBytes)}`,
    `avgInterval=${metrics.averageIntervalMs.toFixed(1)}ms`,
    `jitter=${metrics.jitterMs.toFixed(1)}ms`,
    `level=${metrics.level.toFixed(3)}`,
    `dropped=${metrics.droppedChunks}`,
    `outOfOrder=${metrics.outOfOrderChunks}`,
  ].join(" ");
}

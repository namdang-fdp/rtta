package com.rtta.dorriss.audio;

import java.time.Instant;
import java.util.UUID;

final class AudioSessionMetrics {

	private final UUID sessionId;
	private final Instant startedAt;
	private final long startedAtNanos;
	private final int expectedFrameBytes;
	private final double expectedIntervalMs;

	private long frameCount;
	private long totalBytes;
	private long unexpectedFrameSizeCount;
	private long intervalCount;
	private long totalIntervalNanos;
	private double totalIntervalVariationNanos;
	private long lastFrameArrivalNanos = -1;
	private long lastPeriodicLogNanos;

	AudioSessionMetrics(StartCommand command, Instant startedAt, long startedAtNanos) {
		this.sessionId = command.sessionId();
		this.startedAt = startedAt;
		this.startedAtNanos = startedAtNanos;
		this.expectedFrameBytes = AudioControlProtocol.EXPECTED_FRAME_BYTES;
		this.expectedIntervalMs = command.chunkMs();
		this.lastPeriodicLogNanos = startedAtNanos;
	}

	synchronized AudioSessionSnapshot recordFrame(int frameBytes, long arrivalNanos) {
		frameCount += 1;
		totalBytes += frameBytes;
		if (frameBytes != expectedFrameBytes) {
			unexpectedFrameSizeCount += 1;
		}

		if (lastFrameArrivalNanos >= 0) {
			long intervalNanos = Math.max(0, arrivalNanos - lastFrameArrivalNanos);
			totalIntervalNanos += intervalNanos;
			totalIntervalVariationNanos += Math.abs(
					intervalNanos - expectedIntervalMs * 1_000_000.0);
			intervalCount += 1;
		}
		lastFrameArrivalNanos = arrivalNanos;

		return snapshot(arrivalNanos);
	}

	synchronized AudioSessionSnapshot snapshot(long observedAtNanos) {
		long elapsedNanos = Math.max(0, observedAtNanos - startedAtNanos);
		double elapsedSeconds = elapsedNanos / 1_000_000_000.0;
		double averageFrameBytes = frameCount == 0 ? 0 : (double) totalBytes / frameCount;
		double framesPerSecond = elapsedSeconds == 0 ? 0 : frameCount / elapsedSeconds;
		double bytesPerSecond = elapsedSeconds == 0 ? 0 : totalBytes / elapsedSeconds;
		double averageIntervalMs = intervalCount == 0
				? 0
				: totalIntervalNanos / (double) intervalCount / 1_000_000.0;
		double intervalVariationMs = intervalCount == 0
				? 0
				: totalIntervalVariationNanos / intervalCount / 1_000_000.0;
		Instant lastFrameArrivalTime = lastFrameArrivalNanos < 0
				? null
				: startedAt.plusNanos(Math.max(0, lastFrameArrivalNanos - startedAtNanos));

		return new AudioSessionSnapshot(
				sessionId,
				startedAt,
				lastFrameArrivalTime,
				elapsedNanos / 1_000_000.0,
				frameCount,
				totalBytes,
				averageFrameBytes,
				framesPerSecond,
				bytesPerSecond,
				averageIntervalMs,
				intervalVariationMs,
				unexpectedFrameSizeCount);
	}

	synchronized boolean shouldLog(long observedAtNanos, long intervalNanos) {
		if (observedAtNanos - lastPeriodicLogNanos < intervalNanos) {
			return false;
		}
		lastPeriodicLogNanos = observedAtNanos;
		return true;
	}
}

record AudioSessionSnapshot(
		UUID sessionId,
		Instant startedAt,
		Instant lastFrameArrivalTime,
		double elapsedMs,
		long frameCount,
		long totalBytes,
		double averageFrameBytes,
		double framesPerSecond,
		double bytesPerSecond,
		double averageIntervalMs,
		double intervalVariationMs,
		long unexpectedFrameSizeCount) {
}

package com.rtta.dorriss.audio;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

class AudioSessionMetricsTests {

	private static final long START_NANOS = TimeUnit.SECONDS.toNanos(10);
	private static final StartCommand START = new StartCommand(UUID.randomUUID(), 16_000, 1, 16, 50);

	@Test
	void calculatesHealthyFrameAndPacingMetrics() {
		AudioSessionMetrics metrics = new AudioSessionMetrics(
				START,
				Instant.parse("2026-08-24T00:00:00Z"),
				START_NANOS);

		metrics.recordFrame(1_600, START_NANOS + TimeUnit.MILLISECONDS.toNanos(50));
		AudioSessionSnapshot snapshot = metrics.recordFrame(
				1_600,
				START_NANOS + TimeUnit.MILLISECONDS.toNanos(100));

		assertThat(snapshot.frameCount()).isEqualTo(2);
		assertThat(snapshot.totalBytes()).isEqualTo(3_200);
		assertThat(snapshot.averageFrameBytes()).isEqualTo(1_600);
		assertThat(snapshot.framesPerSecond()).isEqualTo(20);
		assertThat(snapshot.bytesPerSecond()).isEqualTo(32_000);
		assertThat(snapshot.averageIntervalMs()).isEqualTo(50);
		assertThat(snapshot.intervalVariationMs()).isZero();
		assertThat(snapshot.unexpectedFrameSizeCount()).isZero();
		assertThat(snapshot.lastFrameArrivalTime())
				.isEqualTo(Instant.parse("2026-08-24T00:00:00.100Z"));
	}

	@Test
	void countsUnexpectedFrameSizesAndIntervalVariation() {
		AudioSessionMetrics metrics = new AudioSessionMetrics(START, Instant.EPOCH, START_NANOS);

		metrics.recordFrame(1_600, START_NANOS + TimeUnit.MILLISECONDS.toNanos(40));
		AudioSessionSnapshot snapshot = metrics.recordFrame(
				800,
				START_NANOS + TimeUnit.MILLISECONDS.toNanos(100));

		assertThat(snapshot.frameCount()).isEqualTo(2);
		assertThat(snapshot.totalBytes()).isEqualTo(2_400);
		assertThat(snapshot.averageFrameBytes()).isEqualTo(1_200);
		assertThat(snapshot.averageIntervalMs()).isEqualTo(60);
		assertThat(snapshot.intervalVariationMs()).isEqualTo(10);
		assertThat(snapshot.unexpectedFrameSizeCount()).isEqualTo(1);
	}
}

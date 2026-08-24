package com.rtta.dorriss;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

final class PcmAudio {

	static final int SAMPLE_RATE_HZ = 16_000;
	static final int BITS_PER_SAMPLE = 16;
	static final int CHANNELS = 1;
	static final int BYTES_PER_SAMPLE = BITS_PER_SAMPLE / Byte.SIZE;
	static final int FRAME_BYTES = BYTES_PER_SAMPLE * CHANNELS;
	static final int BYTES_PER_SECOND = SAMPLE_RATE_HZ * FRAME_BYTES;
	static final int HARD_MAX_AUDIO_SECONDS = 20;

	private PcmAudio() {
	}

	static ValidatedAudio validate(Path path, int configuredSecondsLimit, int chunkMs) throws IOException {
		if (configuredSecondsLimit <= 0 || configuredSecondsLimit > HARD_MAX_AUDIO_SECONDS) {
			throw new IllegalArgumentException(
					"SPIKE_AUDIO_SECONDS_LIMIT must be between 1 and " + HARD_MAX_AUDIO_SECONDS);
		}
		if (chunkMs <= 0 || chunkMs > 1_000) {
			throw new IllegalArgumentException("SPIKE_CHUNK_MS must be between 1 and 1000");
		}
		if (!Files.isRegularFile(path) || !Files.isReadable(path)) {
			throw new IllegalArgumentException("PCM input is not a readable regular file: " + path);
		}

		long sizeBytes = Files.size(path);
		if (sizeBytes == 0) {
			throw new IllegalArgumentException("PCM input is empty: " + path);
		}
		if (sizeBytes % FRAME_BYTES != 0) {
			throw new IllegalArgumentException("PCM byte size is not aligned to a complete audio frame");
		}

		long quotaLimitBytes = Math.multiplyExact((long) BYTES_PER_SECOND, configuredSecondsLimit);
		if (sizeBytes > quotaLimitBytes) {
			throw new IllegalArgumentException(
					"PCM duration exceeds SPIKE_AUDIO_SECONDS_LIMIT; refusing to open Azure");
		}

		int chunkBytes = Math.multiplyExact(BYTES_PER_SECOND / 1_000, chunkMs);
		long durationMs = sizeBytes * 1_000L / BYTES_PER_SECOND;
		return new ValidatedAudio(path, sizeBytes, durationMs, chunkBytes, quotaLimitBytes);
	}

	record ValidatedAudio(Path path, long sizeBytes, long durationMs, int chunkBytes, long quotaLimitBytes) {
	}
}

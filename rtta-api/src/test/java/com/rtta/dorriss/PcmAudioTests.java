package com.rtta.dorriss;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PcmAudioTests {

	@TempDir
	Path tempDirectory;

	@Test
	void calculatesDurationAndChunkSizeFromPcmFormat() throws Exception {
		Path audio = tempDirectory.resolve("one-second.pcm");
		Files.write(audio, new byte[PcmAudio.BYTES_PER_SECOND]);

		PcmAudio.ValidatedAudio validated = PcmAudio.validate(audio, 20, 50);

		assertThat(validated.durationMs()).isEqualTo(1_000);
		assertThat(validated.chunkBytes()).isEqualTo(1_600);
		assertThat(validated.quotaLimitBytes()).isEqualTo(640_000);
	}

	@Test
	void rejectsConfiguredLimitAboveHardF0Ceiling() throws Exception {
		Path audio = tempDirectory.resolve("audio.pcm");
		Files.write(audio, new byte[PcmAudio.FRAME_BYTES]);

		assertThatThrownBy(() -> PcmAudio.validate(audio, 21, 50))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("between 1 and 20");
	}

	@Test
	void rejectsAudioLongerThanConfiguredLimit() throws Exception {
		Path audio = tempDirectory.resolve("too-long.pcm");
		Files.write(audio, new byte[PcmAudio.BYTES_PER_SECOND + PcmAudio.FRAME_BYTES]);

		assertThatThrownBy(() -> PcmAudio.validate(audio, 1, 50))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("refusing to open Azure");
	}

	@Test
	void rejectsPartialPcmFrame() throws Exception {
		Path audio = tempDirectory.resolve("partial-frame.pcm");
		Files.write(audio, new byte[PcmAudio.FRAME_BYTES + 1]);

		assertThatThrownBy(() -> PcmAudio.validate(audio, 20, 50))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("complete audio frame");
	}
}

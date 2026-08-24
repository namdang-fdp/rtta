package com.rtta.dorriss.recording;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WavStreamingWriterTests {

	@TempDir Path tempDirectory;

	@Test
	void finalizesAPlayableMonoSixteenKilohertzPcmWavHeader() throws Exception {
		WavStreamingWriter writer = WavStreamingWriter.create(tempDirectory, 16_000, (short) 1, (short) 16);
		writer.append(new byte[16_000]);
		writer.append(new byte[16_000]);

		WavStreamingWriter.WavResult result = writer.finalizeFile();
		byte[] wav = Files.readAllBytes(result.path());
		ByteBuffer header = ByteBuffer.wrap(wav).order(ByteOrder.LITTLE_ENDIAN);

		assertThat(new String(wav, 0, 4)).isEqualTo("RIFF");
		assertThat(new String(wav, 8, 4)).isEqualTo("WAVE");
		assertThat(new String(wav, 36, 4)).isEqualTo("data");
		assertThat(header.getInt(4)).isEqualTo(wav.length - 8);
		assertThat(header.getShort(22)).isEqualTo((short) 1);
		assertThat(header.getInt(24)).isEqualTo(16_000);
		assertThat(header.getShort(34)).isEqualTo((short) 16);
		assertThat(header.getInt(40)).isEqualTo(32_000);
		assertThat(result.durationMs()).isEqualTo(1_000);
		assertThat(result.sizeBytes()).isEqualTo(32_044);
	}
}

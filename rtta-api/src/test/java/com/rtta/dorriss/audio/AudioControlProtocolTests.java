package com.rtta.dorriss.audio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.ObjectMapper;

class AudioControlProtocolTests {

	private final AudioControlProtocol protocol = new AudioControlProtocol(new ObjectMapper());

	@Test
	void parsesValidStart() throws Exception {
		UUID sessionId = UUID.randomUUID();

		AudioControlCommand command = protocol.parse("""
				{
				  "type": "START",
				  "sessionId": "%s",
				  "sampleRate": 16000,
				  "channels": 1,
				  "bitsPerSample": 16,
				  "chunkMs": 50
				}
				""".formatted(sessionId));

		assertThat(command).isEqualTo(new StartCommand(sessionId, 16_000, 1, 16, 50));
	}

	@Test
	void rejectsUnsupportedPcmMetadata() {
		assertThatThrownBy(() -> protocol.parse("""
				{
				  "type": "START",
				  "sessionId": "%s",
				  "sampleRate": 48000,
				  "channels": 2,
				  "bitsPerSample": 16,
				  "chunkMs": 50
				}
				""".formatted(UUID.randomUUID())))
				.isInstanceOf(AudioProtocolException.class)
				.hasMessageContaining("16 kHz mono");
	}

	@Test
	void rejectsMalformedStart() {
		assertThatThrownBy(() -> protocol.parse("{\"type\":\"START\"}"))
				.isInstanceOf(AudioProtocolException.class)
				.hasMessageContaining("PCM");
	}

	@Test
	void parsesStopWithSessionId() throws Exception {
		UUID sessionId = UUID.randomUUID();

		assertThat(protocol.parse("""
				{"type":"STOP","sessionId":"%s"}
				""".formatted(sessionId)))
				.isEqualTo(new StopCommand(sessionId));
	}
}

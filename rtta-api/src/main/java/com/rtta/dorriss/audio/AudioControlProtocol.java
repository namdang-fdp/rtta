package com.rtta.dorriss.audio;

import java.util.UUID;

import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

@Component
final class AudioControlProtocol {

	static final int SAMPLE_RATE = 16_000;
	static final int CHANNELS = 1;
	static final int BITS_PER_SAMPLE = 16;
	static final int CHUNK_MS = 50;
	static final int EXPECTED_FRAME_BYTES = 1_600;

	private final ObjectMapper objectMapper;

	AudioControlProtocol(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	AudioControlCommand parse(String payload) throws AudioProtocolException {
		if (payload == null || payload.isBlank()) {
			throw new AudioProtocolException("Control message is empty");
		}

		WireControlMessage message;
		try {
			message = objectMapper.readValue(payload, WireControlMessage.class);
		}
		catch (RuntimeException exception) {
			throw new AudioProtocolException("Control message is not valid JSON", exception);
		}

		if (message == null || message.type() == null) {
			throw new AudioProtocolException("Control message type is required");
		}

		return switch (message.type()) {
			case "AUTH" -> new AuthCommand(
					message.householdCode() == null ? "" : message.householdCode());
			case "START" -> parseStart(message);
			case "STOP" -> new StopCommand(parseSessionId(message.sessionId()));
			default -> throw new AudioProtocolException("Unsupported control message type");
		};
	}

	private StartCommand parseStart(WireControlMessage message) throws AudioProtocolException {
		if (!Integer.valueOf(SAMPLE_RATE).equals(message.sampleRate())
				|| !Integer.valueOf(CHANNELS).equals(message.channels())
				|| !Integer.valueOf(BITS_PER_SAMPLE).equals(message.bitsPerSample())
				|| !Integer.valueOf(CHUNK_MS).equals(message.chunkMs())) {
			throw new AudioProtocolException(
					"Only 16 kHz mono signed 16-bit PCM in 50 ms chunks is supported");
		}

		return new StartCommand(
				parseSessionId(message.sessionId()),
				message.sampleRate(),
				message.channels(),
				message.bitsPerSample(),
				message.chunkMs());
	}

	private UUID parseSessionId(String value) throws AudioProtocolException {
		if (value == null || value.isBlank()) {
			throw new AudioProtocolException("sessionId is required");
		}

		try {
			UUID sessionId = UUID.fromString(value);
			if (!sessionId.toString().equals(value.toLowerCase())) {
				throw new IllegalArgumentException("UUID is not canonical");
			}
			return sessionId;
		}
		catch (IllegalArgumentException exception) {
			throw new AudioProtocolException("sessionId must be a UUID", exception);
		}
	}

	private record WireControlMessage(
			String type,
			String householdCode,
			String sessionId,
			Integer sampleRate,
			Integer channels,
			Integer bitsPerSample,
			Integer chunkMs) {
	}
}

sealed interface AudioControlCommand permits AuthCommand, StartCommand, StopCommand { }

record AuthCommand(String householdCode) implements AudioControlCommand { }

record StartCommand(
		UUID sessionId,
		int sampleRate,
		int channels,
		int bitsPerSample,
		int chunkMs) implements AudioControlCommand {
}

record StopCommand(UUID sessionId) implements AudioControlCommand {
}

final class AudioProtocolException extends Exception {

	AudioProtocolException(String message) {
		super(message);
	}

	AudioProtocolException(String message, Throwable cause) {
		super(message, cause);
	}
}

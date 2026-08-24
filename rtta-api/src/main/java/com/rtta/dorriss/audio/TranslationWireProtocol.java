package com.rtta.dorriss.audio;

import java.util.Objects;
import java.util.UUID;

import com.rtta.dorriss.audio.api.TranslationWireEvent;
import com.rtta.dorriss.audio.api.TranslationWireEventType;
import com.rtta.dorriss.translation.TranslationEvent;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class TranslationWireProtocol {

	private static final String MESSAGE_TYPE = "TRANSLATION";

	private final ObjectMapper objectMapper;

	TranslationWireProtocol(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	TranslationWireEvent map(UUID sessionId, TranslationEvent event) {
		Objects.requireNonNull(sessionId, "sessionId");
		Objects.requireNonNull(event, "event");

		return new TranslationWireEvent(
				MESSAGE_TYPE,
				sessionId.toString(),
				TranslationWireEventType.valueOf(event.type().name()),
				event.sourceText(),
				event.translatedText(),
				event.audioOffsetMs(),
				event.audioDurationMs(),
				event.observedAt());
	}

	String serialize(UUID sessionId, TranslationEvent event) {
		return objectMapper.writeValueAsString(map(sessionId, event));
	}
}

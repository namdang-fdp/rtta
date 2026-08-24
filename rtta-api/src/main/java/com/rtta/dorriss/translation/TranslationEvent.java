package com.rtta.dorriss.translation;

import java.time.Instant;
import java.util.Objects;

public record TranslationEvent(
		TranslationEventType type,
		String sourceText,
		String translatedText,
		long audioOffsetMs,
		long audioDurationMs,
		Instant observedAt) {

	public TranslationEvent {
		Objects.requireNonNull(type, "type");
		Objects.requireNonNull(sourceText, "sourceText");
		Objects.requireNonNull(translatedText, "translatedText");
		Objects.requireNonNull(observedAt, "observedAt");
		if (sourceText.isBlank() && translatedText.isBlank()) {
			throw new IllegalArgumentException("At least one translation text must be non-blank");
		}
		if (audioOffsetMs < 0) {
			throw new IllegalArgumentException("audioOffsetMs must not be negative");
		}
		if (audioDurationMs < 0) {
			throw new IllegalArgumentException("audioDurationMs must not be negative");
		}
	}
}

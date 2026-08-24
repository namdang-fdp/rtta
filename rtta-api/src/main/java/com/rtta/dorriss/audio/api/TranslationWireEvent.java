package com.rtta.dorriss.audio.api;

import java.time.Instant;

public record TranslationWireEvent(
		String type,
		String sessionId,
		TranslationWireEventType eventType,
		String sourceText,
		String translatedText,
		long offsetMs,
		long durationMs,
		Instant observedAt) {
}

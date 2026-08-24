package com.rtta.dorriss.live.api;

import java.time.Instant;

import com.rtta.dorriss.audio.api.TranslationWireEventType;

public record LiveTranslationEvent(
		String type,
		String sessionId,
		String meetingId,
		String utteranceId,
		TranslationWireEventType eventType,
		String sourceText,
		String translatedText,
		long offsetMs,
		long durationMs,
		Instant observedAt) {
}

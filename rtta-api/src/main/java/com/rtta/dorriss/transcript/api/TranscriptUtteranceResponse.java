package com.rtta.dorriss.transcript.api;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.transcript.TranscriptUtterance;

public record TranscriptUtteranceResponse(
		UUID id,
		UUID meetingId,
		long ordinal,
		String sourceText,
		String translatedText,
		long offsetMs,
		long durationMs,
		Instant observedAt,
		Instant createdAt,
		Map<String, Object> providerMetadata) {

	public static TranscriptUtteranceResponse from(TranscriptUtterance utterance) {
		return new TranscriptUtteranceResponse(
				utterance.getId(),
				utterance.getMeetingId(),
				utterance.getOrdinal(),
				utterance.getSourceText(),
				utterance.getTranslatedText(),
				utterance.getOffsetMs(),
				utterance.getDurationMs(),
				utterance.getObservedAt(),
				utterance.getCreatedAt(),
				utterance.getProviderMetadata());
	}
}

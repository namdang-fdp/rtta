package com.rtta.dorriss.note.api;

import java.time.Instant;
import java.util.UUID;

import com.rtta.dorriss.note.ResearchNote;

public record ResearchNoteResponse(
		UUID id,
		UUID meetingId,
		UUID utteranceId,
		UUID bookmarkId,
		String content,
		Long offsetMs,
		String sourceText,
		String translatedText,
		Instant createdAt,
		Instant updatedAt) {

	public static ResearchNoteResponse from(
			ResearchNote note,
			Long offsetMs,
			String sourceText,
			String translatedText) {
		return new ResearchNoteResponse(
				note.getId(),
				note.getMeetingId(),
				note.getUtteranceId(),
				note.getBookmarkId(),
				note.getContent(),
				offsetMs,
				sourceText,
				translatedText,
				note.getCreatedAt(),
				note.getUpdatedAt());
	}
}

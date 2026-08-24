package com.rtta.dorriss.bookmark.api;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.bookmark.Bookmark;

public record BookmarkResponse(
		UUID id,
		UUID meetingId,
		UUID utteranceId,
		Long offsetMs,
		String label,
		String sourceText,
		String translatedText,
		Instant createdAt,
		Map<String, Object> metadata) {

	public static BookmarkResponse from(Bookmark bookmark, String sourceText, String translatedText) {
		return new BookmarkResponse(
				bookmark.getId(),
				bookmark.getMeetingId(),
				bookmark.getUtteranceId(),
				bookmark.getOffsetMs(),
				bookmark.getLabel(),
				sourceText,
				translatedText,
				bookmark.getCreatedAt(),
				bookmark.getMetadata());
	}
}

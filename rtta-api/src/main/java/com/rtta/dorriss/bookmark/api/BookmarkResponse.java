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
		Instant createdAt,
		Map<String, Object> metadata) {

	public static BookmarkResponse from(Bookmark bookmark) {
		return new BookmarkResponse(
				bookmark.getId(),
				bookmark.getMeetingId(),
				bookmark.getUtteranceId(),
				bookmark.getOffsetMs(),
				bookmark.getLabel(),
				bookmark.getCreatedAt(),
				bookmark.getMetadata());
	}
}

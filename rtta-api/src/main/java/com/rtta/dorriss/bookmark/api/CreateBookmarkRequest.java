package com.rtta.dorriss.bookmark.api;

import java.util.UUID;

public record CreateBookmarkRequest(
		UUID utteranceId,
		Long offsetMs,
		String label) {
}

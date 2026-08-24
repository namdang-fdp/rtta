package com.rtta.dorriss.note.api;

import java.util.UUID;

public record CreateResearchNoteRequest(
		UUID utteranceId,
		UUID bookmarkId,
		String content) {
}

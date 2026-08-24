package com.rtta.dorriss.document;

import java.util.Map;
import java.util.UUID;

public record StoredDocumentChunk(
		UUID documentId,
		String fileName,
		String content,
		Map<String, Object> metadata,
		double similarity) {
}

package com.rtta.dorriss.ai;

import java.util.Map;
import java.util.UUID;

public record ResearchContextChunk(
		UUID documentId,
		String fileName,
		String content,
		Map<String, Object> metadata,
		double similarity) {
}

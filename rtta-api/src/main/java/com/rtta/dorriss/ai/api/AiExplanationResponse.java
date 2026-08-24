package com.rtta.dorriss.ai.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiExplanationResponse(
		UUID id,
		UUID meetingId,
		UUID utteranceId,
		String selectedText,
		String userQuestion,
		ExplanationDepth requestedDepth,
		ExplanationDepth effectiveDepth,
		boolean deepModelFallback,
		String model,
		String responseMarkdown,
		List<Map<String, Object>> citations,
		ContextWindow contextWindow,
		Instant createdAt) {

	public record ContextWindow(
			int previousUtterances,
			int followingUtterances,
			int documentChunks) {
	}
}

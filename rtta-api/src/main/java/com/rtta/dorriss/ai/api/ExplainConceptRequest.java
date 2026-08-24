package com.rtta.dorriss.ai.api;

import java.util.UUID;

public record ExplainConceptRequest(
		UUID utteranceId,
		String selectedText,
		String userQuestion,
		ExplanationDepth depth) {
}

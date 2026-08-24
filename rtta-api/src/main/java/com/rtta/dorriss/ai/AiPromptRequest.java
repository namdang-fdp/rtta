package com.rtta.dorriss.ai;

public record AiPromptRequest(
		String model,
		String systemPrompt,
		String userPrompt,
		int maxOutputTokens) {
}

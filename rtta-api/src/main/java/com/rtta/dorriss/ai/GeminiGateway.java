package com.rtta.dorriss.ai;

import java.util.List;

interface GeminiGateway {

	String generate(AiPromptRequest request);

	List<Float> embed(String model, String text);

	default List<List<Float>> embedAll(String model, List<String> texts) {
		return texts.stream().map(text -> embed(model, text)).toList();
	}
}

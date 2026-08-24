package com.rtta.dorriss.ai;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class GeminiResearchAiProvider implements ResearchAiProvider {

	private final GeminiGateway gateway;
	private final GeminiProperties properties;

	GeminiResearchAiProvider(GeminiGateway gateway, GeminiProperties properties) {
		this.gateway = gateway;
		this.properties = properties;
	}

	@Override
	public AiTextResult explainConcept(AiPromptRequest request) {
		return generate(request);
	}

	@Override
	public AiTextResult summarizeMeeting(AiPromptRequest request) {
		return generate(request);
	}

	@Override
	public List<Float> embed(String text) {
		if (text == null || text.isBlank()) throw new IllegalArgumentException("Embedding text is required");
		return gateway.embed(properties.requiredEmbeddingModel(), text.trim());
	}

	@Override
	public List<List<Float>> embedAll(List<String> texts) {
		if (texts == null || texts.isEmpty()) return List.of();
		List<String> cleaned = texts.stream().map(text -> {
			if (text == null || text.isBlank()) throw new IllegalArgumentException("Embedding text is required");
			return text.trim();
		}).toList();
		return gateway.embedAll(properties.requiredEmbeddingModel(), cleaned);
	}

	private AiTextResult generate(AiPromptRequest request) {
		return new AiTextResult(request.model(), gateway.generate(request));
	}
}

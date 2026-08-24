package com.rtta.dorriss.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class GeminiResearchAiProviderTests {

	@Test
	void mapsExplanationSummaryAndEmbeddingThroughTheOfficialSdkGateway() {
		GeminiProperties properties = new GeminiProperties();
		properties.setEmbeddingModel("embedding-test-model");
		FakeGateway gateway = new FakeGateway();
		GeminiResearchAiProvider provider = new GeminiResearchAiProvider(gateway, properties);
		AiPromptRequest request = new AiPromptRequest(
				"flash-test-model",
				"system",
				"context",
				1_000);

		assertThat(provider.explainConcept(request))
				.isEqualTo(new AiTextResult("flash-test-model", "## Giải thích ngắn\nNội dung."));
		assertThat(provider.summarizeMeeting(request).markdown()).contains("Giải thích ngắn");
		assertThat(provider.embed(" Hamiltonian ")).containsExactly(0.25F, 0.75F);
		assertThat(gateway.embeddingModel).isEqualTo("embedding-test-model");
		assertThat(gateway.embeddingText).isEqualTo("Hamiltonian");
	}

	private static final class FakeGateway implements GeminiGateway {
		private String embeddingModel;
		private String embeddingText;

		@Override
		public String generate(AiPromptRequest request) {
			return "## Giải thích ngắn\nNội dung.";
		}

		@Override
		public List<Float> embed(String model, String text) {
			embeddingModel = model;
			embeddingText = text;
			return List.of(0.25F, 0.75F);
		}
	}
}

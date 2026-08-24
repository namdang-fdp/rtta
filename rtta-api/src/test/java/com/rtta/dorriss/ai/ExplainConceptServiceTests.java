package com.rtta.dorriss.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.ai.api.ExplainConceptRequest;
import com.rtta.dorriss.ai.api.ExplanationDepth;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExplainConceptServiceTests {

	@Mock private ExplanationContextBuilder contextBuilder;
	@Mock private VersionedPromptLoader promptLoader;
	@Mock private ResearchAiProvider aiProvider;
	@Mock private AiExplanationRepository explanationRepository;

	private GeminiProperties properties;
	private ExplainConceptService service;

	@BeforeEach
	void setUp() {
		properties = new GeminiProperties();
		properties.setModel("gemini-test-flash");
		properties.setDeepModel("");
		service = new ExplainConceptService(
				contextBuilder,
				promptLoader,
				aiProvider,
				properties,
				explanationRepository,
				Clock.fixed(Instant.parse("2026-08-25T00:00:00Z"), ZoneOffset.UTC));
	}

	@Test
	void mapsDeepToQuickWhenNoDeepModelExistsAndPersistsTheEffectiveContext() {
		UUID meetingId = UUID.randomUUID();
		UUID utteranceId = UUID.randomUUID();
		when(contextBuilder.build(meetingId, utteranceId, "Hamiltonian", null))
				.thenReturn(new BuiltExplanationContext(
						Map.of("promptVersion", "explain-concept-v1"),
						"bounded context",
						List.of(),
						4,
						2,
						0));
		when(promptLoader.load("prompts/explain-concept-v1.md")).thenReturn("system prompt");
		when(aiProvider.explainConcept(any())).thenReturn(new AiTextResult(
				"gemini-test-flash",
				"## Giải thích ngắn\nHamiltonian…"));
		when(explanationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		var response = service.explain(meetingId, new ExplainConceptRequest(
				utteranceId,
				" Hamiltonian ",
				null,
				ExplanationDepth.DEEP));

		assertThat(response.requestedDepth()).isEqualTo(ExplanationDepth.DEEP);
		assertThat(response.effectiveDepth()).isEqualTo(ExplanationDepth.QUICK);
		assertThat(response.deepModelFallback()).isTrue();
		assertThat(response.contextWindow().previousUtterances()).isEqualTo(4);
		assertThat(response.id()).isNotNull();

		ArgumentCaptor<AiExplanation> explanation = ArgumentCaptor.forClass(AiExplanation.class);
		verify(explanationRepository).save(explanation.capture());
		assertThat(explanation.getValue().getContextSnapshot())
				.containsEntry("deepModelFallback", true)
				.containsEntry("model", "gemini-test-flash");
	}

	@Test
	void providerFailureReturnsCalmUnavailableErrorAndDoesNotPersist() {
		UUID meetingId = UUID.randomUUID();
		UUID utteranceId = UUID.randomUUID();
		when(contextBuilder.build(meetingId, utteranceId, "Hamiltonian", null))
				.thenReturn(new BuiltExplanationContext(Map.of(), "context", List.of(), 0, 0, 0));
		when(promptLoader.load(any())).thenReturn("system");
		when(aiProvider.explainConcept(any())).thenThrow(new AiProviderException("secret upstream detail"));

		assertThatThrownBy(() -> service.explain(meetingId, new ExplainConceptRequest(
				utteranceId, "Hamiltonian", null, ExplanationDepth.QUICK)))
				.isInstanceOf(AiServiceUnavailableException.class)
				.hasMessageNotContaining("secret upstream detail");
		verify(explanationRepository, never()).save(any());
	}
}

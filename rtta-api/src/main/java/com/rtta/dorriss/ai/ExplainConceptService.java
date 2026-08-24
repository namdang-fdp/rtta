package com.rtta.dorriss.ai;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.ai.api.AiExplanationResponse;
import com.rtta.dorriss.ai.api.ExplainConceptRequest;
import com.rtta.dorriss.ai.api.ExplanationDepth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ExplainConceptService {

	private static final Logger LOGGER = LoggerFactory.getLogger(ExplainConceptService.class);
	private static final String SYSTEM_PROMPT = "prompts/explain-concept-v1.md";
	private static final int MAX_SELECTED_TEXT_LENGTH = 500;
	private static final int MAX_QUESTION_LENGTH = 2_000;

	private final ExplanationContextBuilder contextBuilder;
	private final VersionedPromptLoader promptLoader;
	private final ResearchAiProvider aiProvider;
	private final GeminiProperties properties;
	private final AiExplanationRepository explanationRepository;
	private final Clock clock;

	@Autowired
	public ExplainConceptService(
			ExplanationContextBuilder contextBuilder,
			VersionedPromptLoader promptLoader,
			ResearchAiProvider aiProvider,
			GeminiProperties properties,
			AiExplanationRepository explanationRepository) {
		this(contextBuilder, promptLoader, aiProvider, properties, explanationRepository, Clock.systemUTC());
	}

	ExplainConceptService(
			ExplanationContextBuilder contextBuilder,
			VersionedPromptLoader promptLoader,
			ResearchAiProvider aiProvider,
			GeminiProperties properties,
			AiExplanationRepository explanationRepository,
			Clock clock) {
		this.contextBuilder = contextBuilder;
		this.promptLoader = promptLoader;
		this.aiProvider = aiProvider;
		this.properties = properties;
		this.explanationRepository = explanationRepository;
		this.clock = clock;
	}

	public AiExplanationResponse explain(UUID meetingId, ExplainConceptRequest request) {
		if (request == null || request.utteranceId() == null) {
			throw badRequest("A persisted utteranceId is required");
		}
		String selectedText = requiredText(request.selectedText(), "selectedText", MAX_SELECTED_TEXT_LENGTH);
		String question = optionalText(request.userQuestion(), "userQuestion", MAX_QUESTION_LENGTH);
		ExplanationDepth requestedDepth = request.depth() == null ? ExplanationDepth.QUICK : request.depth();
		String normalModel = properties.requiredModel();
		String deepModel = properties.optionalDeepModel();
		boolean deepFallback = requestedDepth == ExplanationDepth.DEEP && deepModel == null;
		ExplanationDepth effectiveDepth = deepFallback ? ExplanationDepth.QUICK : requestedDepth;
		String model = requestedDepth == ExplanationDepth.DEEP && deepModel != null ? deepModel : normalModel;

		BuiltExplanationContext context = contextBuilder.build(
				meetingId,
				request.utteranceId(),
				selectedText,
				question);
		Map<String, Object> snapshot = new LinkedHashMap<>(context.snapshot());
		snapshot.put("requestedDepth", requestedDepth.name());
		snapshot.put("effectiveDepth", effectiveDepth.name());
		snapshot.put("deepModelFallback", deepFallback);
		snapshot.put("model", model);

		AiTextResult result;
		try {
			result = aiProvider.explainConcept(new AiPromptRequest(
					model,
					promptLoader.load(SYSTEM_PROMPT),
					context.userPrompt(),
					requestedDepth == ExplanationDepth.DEEP ? 5_000 : 3_000));
		}
		catch (RuntimeException exception) {
			LOGGER.warn("RTTA AI explainFailed meeting={} model={} cause={}",
					meetingId, model, exception.getClass().getSimpleName());
			throw new AiServiceUnavailableException();
		}

		Instant createdAt = clock.instant();
		UUID explanationId = persistSafely(
				meetingId,
				request.utteranceId(),
				selectedText,
				question,
				snapshot,
				result,
				context.citations(),
				createdAt);
		return new AiExplanationResponse(
				explanationId,
				meetingId,
				request.utteranceId(),
				selectedText,
				question,
				requestedDepth,
				effectiveDepth,
				deepFallback,
				result.model(),
				result.markdown(),
				context.citations(),
				new AiExplanationResponse.ContextWindow(
						context.previousCount(),
						context.followingCount(),
						context.documentCount()),
				createdAt);
	}

	private UUID persistSafely(
			UUID meetingId,
			UUID utteranceId,
			String selectedText,
			String question,
			Map<String, Object> snapshot,
			AiTextResult result,
			List<Map<String, Object>> citations,
			Instant createdAt) {
		try {
			AiExplanation explanation = explanationRepository.save(new AiExplanation(
					meetingId,
					utteranceId,
					selectedText,
					question,
					snapshot,
					result.model(),
					result.markdown(),
					citations.isEmpty() ? null : new ArrayList<>(citations),
					createdAt));
			return explanation.getId();
		}
		catch (RuntimeException exception) {
			LOGGER.error("RTTA AI explanationPersistenceFailed meeting={} cause={}",
					meetingId, exception.getClass().getSimpleName());
			return null;
		}
	}

	private String requiredText(String value, String name, int maxLength) {
		String cleaned = optionalText(value, name, maxLength);
		if (cleaned == null) throw badRequest(name + " must not be blank");
		return cleaned;
	}

	private String optionalText(String value, String name, int maxLength) {
		if (value == null) return null;
		String cleaned = value.trim();
		if (cleaned.isEmpty()) return null;
		if (cleaned.length() > maxLength) throw badRequest(name + " is too long");
		return cleaned;
	}

	private ResponseStatusException badRequest(String reason) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
	}
}

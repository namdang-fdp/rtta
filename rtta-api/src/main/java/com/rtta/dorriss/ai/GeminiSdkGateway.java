package com.rtta.dorriss.ai;

import java.util.List;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.HttpRetryOptions;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

@Component
class GeminiSdkGateway implements GeminiGateway {

	private final GeminiProperties properties;
	private volatile Client client;

	GeminiSdkGateway(GeminiProperties properties) {
		this.properties = properties;
	}

	@Override
	public String generate(AiPromptRequest request) {
		try {
			GenerateContentConfig config = GenerateContentConfig.builder()
					.systemInstruction(Content.fromParts(
							com.google.genai.types.Part.fromText(request.systemPrompt())))
					.temperature(0.2F)
					.maxOutputTokens(request.maxOutputTokens())
					.build();
			GenerateContentResponse response = client().models.generateContent(
					request.model(),
					request.userPrompt(),
					config);
			response.checkFinishReason();
			String text = response.text();
			if (text == null || text.isBlank()) throw new AiProviderException("Gemini returned no text");
			return text.trim();
		}
		catch (AiProviderException exception) {
			throw exception;
		}
		catch (RuntimeException exception) {
			throw new AiProviderException("Gemini generation failed", exception);
		}
	}

	@Override
	public List<Float> embed(String model, String text) {
		try {
			return client().models.embedContent(model, text, null)
					.embeddings()
					.flatMap(embeddings -> embeddings.stream().findFirst())
					.flatMap(embedding -> embedding.values())
					.map(List::copyOf)
					.orElseThrow(() -> new AiProviderException("Gemini returned no embedding"));
		}
		catch (AiProviderException exception) {
			throw exception;
		}
		catch (RuntimeException exception) {
			throw new AiProviderException("Gemini embedding failed", exception);
		}
	}

	@PreDestroy
	void close() {
		Client current = client;
		if (current != null) current.close();
	}

	private Client client() {
		Client current = client;
		if (current != null) return current;
		synchronized (this) {
			if (client == null) {
				client = Client.builder()
						.apiKey(properties.requiredApiKey())
						.httpOptions(HttpOptions.builder()
								.retryOptions(HttpRetryOptions.builder()
										.attempts(2)
										.initialDelay(0.5)
										.maxDelay(2.0)
										.httpStatusCodes(408, 429, 500, 502, 503, 504))
								.build())
						.build();
			}
			return client;
		}
	}
}

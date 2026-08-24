package com.rtta.dorriss.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "rtta.ai.gemini")
public class GeminiProperties {

	private String apiKey = "";
	private String model = "gemini-3.7-flash";
	private String deepModel = "";
	private String embeddingModel = "gemini-embedding-001";

	public String getApiKey() { return apiKey; }
	public void setApiKey(String apiKey) { this.apiKey = apiKey; }
	public String getModel() { return model; }
	public void setModel(String model) { this.model = model; }
	public String getDeepModel() { return deepModel; }
	public void setDeepModel(String deepModel) { this.deepModel = deepModel; }
	public String getEmbeddingModel() { return embeddingModel; }
	public void setEmbeddingModel(String embeddingModel) { this.embeddingModel = embeddingModel; }

	public String requiredModel() {
		return requireConfigured(model, "GEMINI_MODEL");
	}

	public String requiredEmbeddingModel() {
		return requireConfigured(embeddingModel, "GEMINI_EMBEDDING_MODEL");
	}

	public String optionalDeepModel() {
		return clean(deepModel);
	}

	public String requiredApiKey() {
		return requireConfigured(apiKey, "GEMINI_API_KEY");
	}

	private String requireConfigured(String value, String name) {
		String cleaned = clean(value);
		if (cleaned == null) throw new AiProviderException(name + " is not configured");
		return cleaned;
	}

	private String clean(String value) {
		if (value == null) return null;
		String cleaned = value.trim();
		return cleaned.isEmpty() ? null : cleaned;
	}
}

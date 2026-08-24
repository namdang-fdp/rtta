package com.rtta.dorriss.translation.azure;

import java.util.function.Consumer;

import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationProvider;
import com.rtta.dorriss.translation.TranslationProviderException;
import com.rtta.dorriss.translation.TranslationSession;
import com.rtta.dorriss.translation.TranslationSessionConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
		prefix = "rtta.translation",
		name = "provider",
		havingValue = "azure",
		matchIfMissing = true)
public final class AzureSpeechTranslationProvider implements TranslationProvider {

	private static final Logger LOGGER = LoggerFactory.getLogger(AzureSpeechTranslationProvider.class);

	private final AzureSpeechTranslationProperties properties;
	private final TranslationSessionConfig sessionConfig;

	AzureSpeechTranslationProvider(
			AzureSpeechTranslationProperties properties,
			TranslationSessionConfig sessionConfig) {
		this.properties = properties;
		this.sessionConfig = sessionConfig;
	}

	@Override
	public TranslationSession open(Consumer<TranslationEvent> listener) {
		try {
			validateConfiguration();
			LOGGER.info(
					"RTTA AZURE opening configuration=subscription region={} sourceLanguage={} targetLanguage={} phraseListEnabled={} phraseListWeight={} phraseTermCount={} developmentLimit={}",
					properties.region(),
					sessionConfig.sourceLanguage(),
					sessionConfig.targetLanguage(),
					sessionConfig.phraseListEnabled(),
					sessionConfig.phraseListWeight(),
					sessionConfig.phraseListTerms().size(),
					sessionConfig.developmentSessionLimit());
			return AzureSpeechTranslationSession.open(properties, sessionConfig, listener);
		}
		catch (RuntimeException exception) {
			String detail = safeMessage(exception);
			LOGGER.warn("RTTA AZURE openFailed detail={}", detail);
			if (exception instanceof TranslationProviderException providerException) {
				throw providerException;
			}
			throw new TranslationProviderException(
					"Azure translation session could not be opened: " + detail,
					exception);
		}
	}

	private void validateConfiguration() {
		if (properties.key().isBlank()) {
			throw new TranslationProviderException("SPEECH_KEY is missing or blank");
		}
		if (properties.region().isBlank()) {
			throw new TranslationProviderException("SPEECH_REGION is missing or blank");
		}
	}

	private String safeMessage(Throwable exception) {
		String message = exception.getMessage();
		if (message == null || message.isBlank()) {
			message = exception.getClass().getSimpleName();
		}
		return sanitize(message);
	}

	private String sanitize(String message) {
		String sanitized = properties.key().isBlank()
				? message
				: message.replace(properties.key(), "[REDACTED]");
		sanitized = sanitized.replaceAll("[\\r\\n]+", " ").trim();
		return sanitized.length() <= 500 ? sanitized : sanitized.substring(0, 500) + "...";
	}
}

package com.rtta.dorriss.translation;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("rtta.translation")
public record TranslationProperties(
		String sourceLanguage,
		String targetLanguage,
		PhraseList phraseList,
		Duration developmentSessionLimit) {

	TranslationSessionConfig toSessionConfig() {
		PhraseList configuredPhraseList = phraseList == null
				? new PhraseList(false, 1.1, "")
				: phraseList;
		Duration configuredLimit = developmentSessionLimit == null
				? Duration.ZERO
				: developmentSessionLimit;
		return new TranslationSessionConfig(
				16_000,
				1,
				16,
				sourceLanguage,
				targetLanguage,
				configuredPhraseList.enabled(),
				configuredPhraseList.weight(),
				TranslationSessionConfig.parseTerms(configuredPhraseList.terms()),
				configuredLimit);
	}

	public record PhraseList(boolean enabled, double weight, String terms) {
	}
}

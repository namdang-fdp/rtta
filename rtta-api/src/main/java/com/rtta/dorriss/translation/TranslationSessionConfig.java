package com.rtta.dorriss.translation;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

public record TranslationSessionConfig(
		int sampleRateHz,
		int channels,
		int bitsPerSample,
		String sourceLanguage,
		String targetLanguage,
		boolean phraseListEnabled,
		double phraseListWeight,
		List<String> phraseListTerms,
		Duration developmentSessionLimit) {

	public TranslationSessionConfig {
		if (sampleRateHz <= 0 || channels <= 0 || bitsPerSample <= 0) {
			throw new IllegalArgumentException("Audio format values must be positive");
		}
		sourceLanguage = requireText(sourceLanguage, "sourceLanguage");
		targetLanguage = requireText(targetLanguage, "targetLanguage");
		if (!Double.isFinite(phraseListWeight)
				|| phraseListWeight <= 0.0 || phraseListWeight > 2.0) {
			throw new IllegalArgumentException("Phrase list weight must be greater than 0 and at most 2");
		}
		phraseListTerms = normalizeTerms(phraseListTerms);
		if (phraseListEnabled && phraseListTerms.isEmpty()) {
			throw new IllegalArgumentException("Phrase list is enabled but no terms are configured");
		}
		Objects.requireNonNull(developmentSessionLimit, "developmentSessionLimit");
		if (developmentSessionLimit.isNegative()) {
			throw new IllegalArgumentException("Development session limit must not be negative");
		}
	}

	public static List<String> parseTerms(String commaSeparatedTerms) {
		if (commaSeparatedTerms == null || commaSeparatedTerms.isBlank()) {
			return List.of();
		}
		return normalizeTerms(Arrays.asList(commaSeparatedTerms.split(",")));
	}

	private static List<String> normalizeTerms(List<String> terms) {
		if (terms == null || terms.isEmpty()) {
			return List.of();
		}
		return terms.stream()
				.filter(Objects::nonNull)
				.map(String::trim)
				.filter(term -> !term.isEmpty())
				.distinct()
				.toList();
	}

	private static String requireText(String value, String name) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(name + " must not be blank");
		}
		return value.trim();
	}
}

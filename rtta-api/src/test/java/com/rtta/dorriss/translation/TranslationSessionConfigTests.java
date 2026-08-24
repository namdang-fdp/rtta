package com.rtta.dorriss.translation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;

class TranslationSessionConfigTests {

	@Test
	void supportsDisabledPhraseListWithoutTerms() {
		TranslationSessionConfig config = config(false, 1.1, List.of());

		assertThat(config.phraseListEnabled()).isFalse();
		assertThat(config.phraseListTerms()).isEmpty();
	}

	@Test
	void supportsEnabledLowBiasPhraseListAndNormalizesTerms() {
		TranslationSessionConfig config = config(
				true,
				1.1,
				List.of(" pulsar ", "neutron star", "pulsar", " "));

		assertThat(config.phraseListEnabled()).isTrue();
		assertThat(config.phraseListWeight()).isEqualTo(1.1);
		assertThat(config.phraseListTerms()).containsExactly("pulsar", "neutron star");
	}

	@Test
	void validatesPhraseListWeight() {
		assertThatThrownBy(() -> config(false, 0, List.of()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("weight");
		assertThatThrownBy(() -> config(false, 2.01, List.of()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("weight");
		assertThatThrownBy(() -> config(false, Double.NaN, List.of()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("weight");
	}

	@Test
	void rejectsEnabledPhraseListWithoutTerms() {
		assertThatThrownBy(() -> config(true, 1.1, List.of()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("no terms");
	}

	@Test
	void parsesConfiguredTermsAndPreservesFirstOccurrenceOrder() {
		assertThat(TranslationSessionConfig.parseTerms(
				"pulsar, neutron star, ,radio telescope,pulsar, magnetic field"))
				.containsExactly("pulsar", "neutron star", "radio telescope", "magnetic field");
		assertThat(TranslationSessionConfig.parseTerms("  ")).isEmpty();
	}

	private TranslationSessionConfig config(
			boolean phraseListEnabled,
			double phraseListWeight,
			List<String> terms) {
		return new TranslationSessionConfig(
				16_000,
				1,
				16,
				"en-US",
				"vi",
				phraseListEnabled,
				phraseListWeight,
				terms,
				Duration.ofSeconds(120));
	}
}

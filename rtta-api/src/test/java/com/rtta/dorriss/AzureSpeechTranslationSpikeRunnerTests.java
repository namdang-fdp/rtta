package com.rtta.dorriss;

import java.util.List;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AzureSpeechTranslationSpikeRunnerTests {

	@Test
	void parsesAndDeduplicatesConfiguredPhraseListWithoutChangingOrder() {
		List<String> terms = AzureSpeechTranslationSpikeRunner.parsePhraseList(
				"eigenstate, eigenvalues, Schrödinger equation, eigenstate, , Hamiltonian");

		assertThat(terms).containsExactly(
				"eigenstate", "eigenvalues", "Schrödinger equation", "Hamiltonian");
	}

	@Test
	void calculatesNearestRankPercentiles() {
		List<Long> samples = List.of(40L, 10L, 30L, 20L, 50L);

		assertThat(AzureSpeechTranslationSpikeRunner.nearestRankPercentile(samples, 50)).isEqualTo(30L);
		assertThat(AzureSpeechTranslationSpikeRunner.nearestRankPercentile(samples, 90)).isEqualTo(50L);
		assertThat(AzureSpeechTranslationSpikeRunner.nearestRankPercentile(samples, 95)).isEqualTo(50L);
	}

	@Test
	void rejectsPercentileWithoutSamples() {
		assertThatThrownBy(() -> AzureSpeechTranslationSpikeRunner.nearestRankPercentile(List.of(), 50))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("sample");
	}
}

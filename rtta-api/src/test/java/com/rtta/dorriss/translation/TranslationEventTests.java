package com.rtta.dorriss.translation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class TranslationEventTests {

	@Test
	void retainsProviderIndependentRecognitionData() {
		Instant observedAt = Instant.parse("2026-08-24T12:00:00Z");

		TranslationEvent event = new TranslationEvent(
				TranslationEventType.FINAL,
				"Pulsars are rotating neutron stars.",
				"Pulsar là các sao neutron quay.",
				1_250,
				2_750,
				observedAt);

		assertThat(event.type()).isEqualTo(TranslationEventType.FINAL);
		assertThat(event.sourceText()).isEqualTo("Pulsars are rotating neutron stars.");
		assertThat(event.translatedText()).isEqualTo("Pulsar là các sao neutron quay.");
		assertThat(event.audioOffsetMs()).isEqualTo(1_250);
		assertThat(event.audioDurationMs()).isEqualTo(2_750);
		assertThat(event.observedAt()).isEqualTo(observedAt);
	}

	@Test
	void rejectsEmptyOrNegativeRecognitionData() {
		assertThatThrownBy(() -> new TranslationEvent(
				TranslationEventType.PARTIAL, "", "", 0, 0, Instant.now()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("translation text");

		assertThatThrownBy(() -> new TranslationEvent(
				TranslationEventType.PARTIAL, "Pulsar", "", -1, 0, Instant.now()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("audioOffsetMs");
	}
}

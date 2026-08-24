package com.rtta.dorriss.audio;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import com.rtta.dorriss.audio.api.TranslationWireEvent;
import com.rtta.dorriss.audio.api.TranslationWireEventType;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class TranslationWireProtocolTests {

	private static final UUID SESSION_ID =
			UUID.fromString("2b9c9ee0-1511-49d2-a779-d81cf7f7b441");
	private final TranslationWireProtocol protocol =
			new TranslationWireProtocol(new ObjectMapper());

	@Test
	void mapsPartialDomainEventToStableWireDtoAndJson() {
		TranslationEvent event = new TranslationEvent(
				TranslationEventType.PARTIAL,
				"Pulsars are rapidly rotating...",
				"Pulsar là những...",
				1_230,
				760,
				Instant.parse("2026-08-25T00:00:00Z"));

		TranslationWireEvent wireEvent = protocol.map(SESSION_ID, event);

		assertThat(wireEvent).isEqualTo(new TranslationWireEvent(
				"TRANSLATION",
				SESSION_ID.toString(),
				TranslationWireEventType.PARTIAL,
				"Pulsars are rapidly rotating...",
				"Pulsar là những...",
				1_230,
				760,
				Instant.parse("2026-08-25T00:00:00Z")));
		assertThat(protocol.serialize(SESSION_ID, event)).isEqualTo(
				"{\"type\":\"TRANSLATION\",\"sessionId\":\"2b9c9ee0-1511-49d2-a779-d81cf7f7b441\"," +
						"\"eventType\":\"PARTIAL\",\"sourceText\":\"Pulsars are rapidly rotating...\"," +
						"\"translatedText\":\"Pulsar là những...\",\"offsetMs\":1230," +
						"\"durationMs\":760,\"observedAt\":\"2026-08-25T00:00:00Z\"}");
	}

	@Test
	void mapsFinalDomainEventToStableWireDtoAndJson() {
		TranslationEvent event = new TranslationEvent(
				TranslationEventType.FINAL,
				"Pulsars are rapidly rotating neutron stars.",
				"Pulsar là các sao neutron quay nhanh.",
				1_230,
				2_760,
				Instant.parse("2026-08-25T00:00:02.760Z"));

		TranslationWireEvent wireEvent = protocol.map(SESSION_ID, event);

		assertThat(wireEvent.eventType()).isEqualTo(TranslationWireEventType.FINAL);
		assertThat(wireEvent.offsetMs()).isEqualTo(1_230);
		assertThat(wireEvent.durationMs()).isEqualTo(2_760);
		assertThat(protocol.serialize(SESSION_ID, event)).isEqualTo(
				"{\"type\":\"TRANSLATION\",\"sessionId\":\"2b9c9ee0-1511-49d2-a779-d81cf7f7b441\"," +
						"\"eventType\":\"FINAL\",\"sourceText\":\"Pulsars are rapidly rotating neutron stars.\"," +
						"\"translatedText\":\"Pulsar là các sao neutron quay nhanh.\",\"offsetMs\":1230," +
						"\"durationMs\":2760,\"observedAt\":\"2026-08-25T00:00:02.760Z\"}");
	}
}

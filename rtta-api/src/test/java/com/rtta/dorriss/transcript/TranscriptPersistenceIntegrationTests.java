package com.rtta.dorriss.transcript;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingHistoryService;
import com.rtta.dorriss.meeting.MeetingLifecycleService;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spike.enabled=false")
@Transactional
class TranscriptPersistenceIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired
	private MeetingLifecycleService lifecycleService;

	@Autowired
	private TranscriptPersistenceService persistenceService;

	@Autowired
	private TranscriptUtteranceRepository utteranceRepository;

	@Autowired
	private MeetingHistoryService historyService;

	@Test
	void persistsOnlyFinalsAndDeduplicatesRepeatedProviderEvents() {
		UUID sessionId = UUID.randomUUID();
		Meeting meeting = startMeeting(sessionId);
		TranslationEvent partial = event(TranslationEventType.PARTIAL, 500, "partial", "một phần");
		TranslationEvent firstFinal = event(TranslationEventType.FINAL, 1_000, "Hamiltonian", "Hamiltonian");

		assertThat(persistenceService.persistFinal(sessionId, partial, Map.of())).isEmpty();
		TranscriptUtterance first = persistenceService
				.persistFinal(sessionId, firstFinal, Map.of("provider", "fake"))
				.orElseThrow();
		TranscriptUtterance duplicate = persistenceService
				.persistFinal(sessionId, firstFinal, Map.of("provider", "fake"))
				.orElseThrow();

		assertThat(duplicate.getId()).isEqualTo(first.getId());
		assertThat(utteranceRepository.countByMeetingId(meeting.getId())).isEqualTo(1);
		assertThat(first.getOrdinal()).isEqualTo(1);
	}

	@Test
	void transcriptHistoryIsOrderedByAudioTimelineAndSearchesBothLanguages() {
		UUID sessionId = UUID.randomUUID();
		Meeting meeting = startMeeting(sessionId);
		persistenceService.persistFinal(
				sessionId,
				event(TranslationEventType.FINAL, 2_000, "time evolution", "tiến hóa theo thời gian"),
				Map.of());
		persistenceService.persistFinal(
				sessionId,
				event(TranslationEventType.FINAL, 1_000, "total energy", "tổng năng lượng"),
				Map.of());

		var timeline = historyService.getTranscript(meeting.getId(), null, 0, 100);
		var search = historyService.getTranscript(meeting.getId(), "NĂNG LƯỢNG", 0, 100);

		assertThat(timeline.items()).extracting(item -> item.offsetMs())
				.containsExactly(1_000L, 2_000L);
		assertThat(search.items()).hasSize(1);
		assertThat(search.items().getFirst().sourceText()).isEqualTo("total energy");
	}

	private Meeting startMeeting(UUID sessionId) {
		return lifecycleService.startMeeting(
				sessionId,
				"Research meeting",
				"en-US",
				"vi",
				Instant.parse("2026-08-25T00:00:00Z"),
				Map.of());
	}

	private TranslationEvent event(
			TranslationEventType type,
			long offsetMs,
			String source,
			String translation) {
		return new TranslationEvent(
				type,
				source,
				translation,
				offsetMs,
				500,
				Instant.parse("2026-08-25T00:00:05Z"));
	}
}

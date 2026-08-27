package com.rtta.dorriss.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.bookmark.BookmarkService;
import com.rtta.dorriss.bookmark.api.CreateBookmarkRequest;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingLifecycleService;
import com.rtta.dorriss.note.ResearchNoteService;
import com.rtta.dorriss.note.api.CreateResearchNoteRequest;
import com.rtta.dorriss.transcript.TranscriptPersistenceService;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spike.enabled=false")
@Transactional
class ExplanationContextBuilderIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired private MeetingLifecycleService meetingLifecycleService;
	@Autowired private TranscriptPersistenceService transcriptPersistenceService;
	@Autowired private BookmarkService bookmarkService;
	@Autowired private ResearchNoteService noteService;
	@Autowired private ExplanationContextBuilder contextBuilder;
	@Autowired private AiExplanationRepository explanationRepository;

	@Test
	void buildsABoundedChronologicalContextWithOnlyRelevantAnnotations() {
		UUID sessionId = UUID.randomUUID();
		Meeting meeting = meetingLifecycleService.startMeeting(
				sessionId,
				"Quantum Dynamics Seminar",
				"en-US",
				"vi",
				Instant.parse("2026-08-25T00:00:00Z"),
				Map.of());
		List<TranscriptUtterance> utterances = new ArrayList<>();
		for (int index = 1; index <= 8; index++) {
			utterances.add(transcriptPersistenceService.persistFinal(
					sessionId,
					new TranslationEvent(
							TranslationEventType.FINAL,
							"source " + index,
							"bản dịch " + index,
							index * 1_000L,
							500,
							Instant.parse("2026-08-25T00:00:10Z").plusSeconds(index)),
					Map.of()).orElseThrow());
		}
		TranscriptUtterance target = utterances.get(5);
		bookmarkService.create(meeting.getId(), new CreateBookmarkRequest(
				target.getId(), null, "Important definition"));
		noteService.create(meeting.getId(), new CreateResearchNoteRequest(
				target.getId(), null, "Compare with the derivation"));
		noteService.create(meeting.getId(), new CreateResearchNoteRequest(
				utterances.get(1).getId(), null, "Unrelated private note"));

		BuiltExplanationContext context = contextBuilder.build(
				meeting.getId(),
				target.getId(),
				"Hamiltonian",
				"Why is it used here?");

		assertThat(context.previousCount()).isEqualTo(5);
		assertThat(context.followingCount()).isEqualTo(2);
		assertThat(context.documentCount()).isZero();
		assertThat(context.userPrompt())
				.contains("source 1", "source 6", "source 8", "Important definition", "Compare with the derivation")
				.doesNotContain("Unrelated private note");
		assertThat(context.snapshot()).containsEntry("promptVersion", "explain-concept-v1");
		assertThat(context.citations()).isEmpty();
	}

	@Test
	void includesPersistedExplanationHistoryForFollowUpQuestions() {
		UUID sessionId = UUID.randomUUID();
		Meeting meeting = meetingLifecycleService.startMeeting(
				sessionId,
				"Medical Imaging Seminar",
				"en-US",
				"vi",
				Instant.parse("2026-08-25T00:00:00Z"),
				Map.of());
		TranscriptUtterance utterance = transcriptPersistenceService.persistFinal(
				sessionId,
				new TranslationEvent(
						TranslationEventType.FINAL,
						"X-rays can ionize molecules.",
						"Tia X có thể ion hóa phân tử.",
						1_000,
						500,
						Instant.parse("2026-08-25T00:00:01Z")),
				Map.of()).orElseThrow();
		explanationRepository.save(new AiExplanation(
				meeting.getId(),
				utterance.getId(),
				"Tia X",
				"Tia X là gì?",
				Map.of(),
				"hidden-model-id",
				"Tia X là bức xạ điện từ năng lượng cao.",
				List.of(),
				Instant.parse("2026-08-25T00:00:02Z")));

		BuiltExplanationContext followUp = contextBuilder.build(
				meeting.getId(),
				utterance.getId(),
				"Tia X",
				"Vì sao có thể gây tổn thương DNA?");

		assertThat(followUp.userPrompt())
				.contains("<PREVIOUS_EXPLANATIONS>", "Tia X là gì?", "bức xạ điện từ năng lượng cao");
	}
}

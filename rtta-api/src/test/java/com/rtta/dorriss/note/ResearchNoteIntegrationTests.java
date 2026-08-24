package com.rtta.dorriss.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingLifecycleService;
import com.rtta.dorriss.note.api.CreateResearchNoteRequest;
import com.rtta.dorriss.note.api.UpdateResearchNoteRequest;
import com.rtta.dorriss.transcript.TranscriptNotFoundException;
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
class ResearchNoteIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired
	private MeetingLifecycleService meetingLifecycleService;

	@Autowired
	private TranscriptPersistenceService transcriptPersistenceService;

	@Autowired
	private ResearchNoteService noteService;

	@Test
	void createsListsUpdatesAndDeletesTimestampLinkedNotesWithTranscriptContext() {
		UUID sessionId = UUID.randomUUID();
		Meeting meeting = startMeeting(sessionId);
		TranscriptUtterance utterance = persistUtterance(sessionId, 42_000);

		var created = noteService.create(meeting.getId(), new CreateResearchNoteRequest(
				utterance.getId(),
				null,
				"  Compare this definition with the paper.  "));

		assertThat(created.content()).isEqualTo("Compare this definition with the paper.");
		assertThat(created.offsetMs()).isEqualTo(42_000);
		assertThat(created.translatedText()).contains("Hamiltonian");
		assertThat(noteService.list(meeting.getId())).extracting(item -> item.id())
				.containsExactly(created.id());

		var updated = noteService.update(
				meeting.getId(),
				created.id(),
				new UpdateResearchNoteRequest("Review the derivation."));
		assertThat(updated.content()).isEqualTo("Review the derivation.");
		assertThat(updated.updatedAt()).isAfterOrEqualTo(updated.createdAt());

		noteService.delete(meeting.getId(), created.id());
		assertThat(noteService.list(meeting.getId())).isEmpty();
		assertThatThrownBy(() -> noteService.delete(meeting.getId(), created.id()))
				.isInstanceOf(ResearchNoteNotFoundException.class);
	}

	@Test
	void supportsMeetingLevelNotesAndRejectsCrossMeetingUtterances() {
		UUID firstSession = UUID.randomUUID();
		Meeting firstMeeting = startMeeting(firstSession);
		TranscriptUtterance utterance = persistUtterance(firstSession, 1_000);
		Meeting secondMeeting = startMeeting(UUID.randomUUID());

		var general = noteService.create(secondMeeting.getId(), new CreateResearchNoteRequest(
				null,
				null,
				"General research thought"));
		assertThat(general.utteranceId()).isNull();
		assertThat(general.offsetMs()).isNull();

		assertThatThrownBy(() -> noteService.create(
				secondMeeting.getId(),
				new CreateResearchNoteRequest(utterance.getId(), null, "Wrong meeting")))
				.isInstanceOf(TranscriptNotFoundException.class);
		assertThat(firstMeeting.getId()).isNotEqualTo(secondMeeting.getId());
	}

	private Meeting startMeeting(UUID sessionId) {
		return meetingLifecycleService.startMeeting(
				sessionId,
				"Research meeting",
				"en-US",
				"vi",
				Instant.parse("2026-08-25T00:00:00Z"),
				Map.of());
	}

	private TranscriptUtterance persistUtterance(UUID sessionId, long offsetMs) {
		return transcriptPersistenceService.persistFinal(
				sessionId,
				new TranslationEvent(
						TranslationEventType.FINAL,
						"The Hamiltonian determines the time evolution.",
						"Hamiltonian quyết định sự tiến triển theo thời gian.",
						offsetMs,
						1_500,
						Instant.parse("2026-08-25T00:00:05Z")),
				Map.of())
				.orElseThrow();
	}
}

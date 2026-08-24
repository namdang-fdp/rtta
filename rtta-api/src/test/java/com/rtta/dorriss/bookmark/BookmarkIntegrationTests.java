package com.rtta.dorriss.bookmark;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.bookmark.api.CreateBookmarkRequest;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingLifecycleService;
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
class BookmarkIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired
	private MeetingLifecycleService meetingLifecycleService;

	@Autowired
	private TranscriptPersistenceService transcriptPersistenceService;

	@Autowired
	private BookmarkService bookmarkService;

	@Test
	void createsListsDeduplicatesAndDeletesUtteranceBookmarks() {
		UUID sessionId = UUID.randomUUID();
		Meeting meeting = startMeeting(sessionId);
		TranscriptUtterance utterance = transcriptPersistenceService.persistFinal(
				sessionId,
				new TranslationEvent(
						TranslationEventType.FINAL,
						"The Hamiltonian controls time evolution.",
						"Hamiltonian chi phối sự tiến triển theo thời gian.",
						12_500,
						1_500,
						Instant.parse("2026-08-25T00:00:14Z")),
				Map.of())
				.orElseThrow();

		var first = bookmarkService.create(
				meeting.getId(),
				new CreateBookmarkRequest(utterance.getId(), null, "Review derivation"));
		var duplicate = bookmarkService.create(
				meeting.getId(),
				new CreateBookmarkRequest(utterance.getId(), null, "Ignored duplicate"));

		assertThat(duplicate.id()).isEqualTo(first.id());
		assertThat(first.offsetMs()).isEqualTo(12_500);
		assertThat(bookmarkService.list(meeting.getId()))
				.singleElement()
				.extracting(item -> item.label())
				.isEqualTo("Review derivation");

		bookmarkService.delete(meeting.getId(), first.id());
		assertThat(bookmarkService.list(meeting.getId())).isEmpty();
		assertThatThrownBy(() -> bookmarkService.delete(meeting.getId(), first.id()))
				.isInstanceOf(BookmarkNotFoundException.class);
	}

	@Test
	void rejectsAnUtteranceFromAnotherMeetingAndAllowsTimestampOnlyBookmark() {
		UUID firstSession = UUID.randomUUID();
		Meeting firstMeeting = startMeeting(firstSession);
		TranscriptUtterance utterance = transcriptPersistenceService.persistFinal(
				firstSession,
				new TranslationEvent(
						TranslationEventType.FINAL,
						"source",
						"bản dịch",
						1_000,
						500,
						Instant.parse("2026-08-25T00:00:02Z")),
				Map.of())
				.orElseThrow();
		Meeting otherMeeting = startMeeting(UUID.randomUUID());

		assertThatThrownBy(() -> bookmarkService.create(
				otherMeeting.getId(),
				new CreateBookmarkRequest(utterance.getId(), null, null)))
				.isInstanceOf(TranscriptNotFoundException.class);

		var timestampBookmark = bookmarkService.create(
				otherMeeting.getId(),
				new CreateBookmarkRequest(null, 25_000L, null));
		assertThat(timestampBookmark.utteranceId()).isNull();
		assertThat(timestampBookmark.offsetMs()).isEqualTo(25_000L);
		assertThat(firstMeeting.getId()).isNotEqualTo(otherMeeting.getId());
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
}

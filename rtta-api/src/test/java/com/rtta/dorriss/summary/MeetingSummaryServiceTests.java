package com.rtta.dorriss.summary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import com.rtta.dorriss.ai.AiPromptRequest;
import com.rtta.dorriss.ai.AiServiceUnavailableException;
import com.rtta.dorriss.ai.AiTextResult;
import com.rtta.dorriss.ai.GeminiProperties;
import com.rtta.dorriss.ai.ResearchAiProvider;
import com.rtta.dorriss.ai.VersionedPromptLoader;
import com.rtta.dorriss.bookmark.Bookmark;
import com.rtta.dorriss.bookmark.BookmarkRepository;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.note.ResearchNote;
import com.rtta.dorriss.note.ResearchNoteRepository;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MeetingSummaryServiceTests {

	@Mock private MeetingRepository meetingRepository;
	@Mock private TranscriptUtteranceRepository utteranceRepository;
	@Mock private BookmarkRepository bookmarkRepository;
	@Mock private ResearchNoteRepository noteRepository;
	@Mock private MeetingSummaryRepository summaryRepository;
	@Mock private VersionedPromptLoader promptLoader;
	@Mock private ResearchAiProvider aiProvider;

	private final Instant now = Instant.parse("2026-08-25T00:00:00Z");
	private GeminiProperties properties;

	@BeforeEach
	void setUp() {
		properties = new GeminiProperties();
		properties.setModel("gemini-test-flash");
	}

	@Test
	void hierarchicallySummarizesTranscriptThenSynthesizesBookmarksAndNotes() {
		Meeting meeting = completedMeeting();
		List<TranscriptUtterance> transcript = List.of(
				utterance(meeting.getId(), 0, "A".repeat(700)),
				utterance(meeting.getId(), 1, "B".repeat(700)),
				utterance(meeting.getId(), 2, "C".repeat(700)));
		Bookmark bookmark = new Bookmark(meeting.getId(), transcript.get(1).getId(), 1_000L,
				"Key evidence", now, Map.of());
		ResearchNote note = new ResearchNote(meeting.getId(), transcript.get(2).getId(), null,
				"Compare this result with the baseline paper", now);
		when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
		when(utteranceRepository.findAllByMeetingIdOrderByOrdinalAsc(meeting.getId()))
				.thenReturn(transcript);
		when(bookmarkRepository.findAllByMeetingIdOrderByOffsetMsAscCreatedAtAscIdAsc(meeting.getId()))
				.thenReturn(List.of(bookmark));
		when(noteRepository.findAllByMeetingIdOrderByCreatedAtAscIdAsc(meeting.getId()))
				.thenReturn(List.of(note));
		when(promptLoader.load(any())).thenAnswer(invocation -> "system:" + invocation.getArgument(0));
		AtomicInteger calls = new AtomicInteger();
		when(aiProvider.summarizeMeeting(any())).thenAnswer(invocation -> {
			int call = calls.incrementAndGet();
			return call <= 3
					? new AiTextResult("gemini-test-flash", "chunk " + call)
					: new AiTextResult("gemini-test-flash", "# Tóm tắt\n\nKết quả.");
		});
		when(summaryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		MeetingSummaryService service = service(new TranscriptSummaryChunker(1_000));
		var response = service.generate(meeting.getId());

		assertThat(response.summaryMarkdown()).isEqualTo("# Tóm tắt\n\nKết quả.");
		assertThat(response.structuredData())
				.containsEntry("strategy", "HIERARCHICAL")
				.containsEntry("chunkCount", 3)
				.containsEntry("bookmarkCount", 1)
				.containsEntry("noteCount", 1);
		ArgumentCaptor<AiPromptRequest> prompts = ArgumentCaptor.forClass(AiPromptRequest.class);
		verify(aiProvider, times(4)).summarizeMeeting(prompts.capture());
		String finalPrompt = prompts.getAllValues().getLast().userPrompt();
		assertThat(finalPrompt)
				.contains("Key evidence", "Compare this result with the baseline paper")
				.contains("chronological intermediate summaries");
	}

	@Test
	void rejectsForbiddenModelOutputWithoutPersistingIt() {
		Meeting meeting = completedMeeting();
		when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
		when(utteranceRepository.findAllByMeetingIdOrderByOrdinalAsc(meeting.getId()))
				.thenReturn(List.of(utterance(meeting.getId(), 0, "short")));
		when(bookmarkRepository.findAllByMeetingIdOrderByOffsetMsAscCreatedAtAscIdAsc(meeting.getId()))
				.thenReturn(List.of());
		when(noteRepository.findAllByMeetingIdOrderByCreatedAtAscIdAsc(meeting.getId()))
				.thenReturn(List.of());
		when(promptLoader.load(any())).thenReturn("system");
		when(aiProvider.summarizeMeeting(any())).thenReturn(new AiTextResult(
				"gemini-test-flash", "# Tóm tắt\nNội dung\n## Action Items\n- task"));

		assertThatThrownBy(() -> service(new TranscriptSummaryChunker(1_000)).generate(meeting.getId()))
				.isInstanceOf(AiServiceUnavailableException.class);
		verify(summaryRepository, never()).save(any());
	}

	private MeetingSummaryService service(TranscriptSummaryChunker chunker) {
		return new MeetingSummaryService(
				meetingRepository, utteranceRepository, bookmarkRepository, noteRepository,
				summaryRepository, chunker, new SummaryOutputPolicy(), promptLoader, aiProvider,
				properties, Clock.fixed(now, ZoneOffset.UTC));
	}

	private Meeting completedMeeting() {
		Meeting meeting = Meeting.start(UUID.randomUUID(), "Research seminar", "en-US", "vi-VN",
				now.minusSeconds(3_600), now.minusSeconds(3_600), Map.of());
		meeting.complete(now, now);
		return meeting;
	}

	private TranscriptUtterance utterance(UUID meetingId, int ordinal, String source) {
		return new TranscriptUtterance(
				meetingId, ordinal, "%064d".formatted(ordinal), source, "bản dịch " + ordinal,
				ordinal * 1_000L, 800, now, now, Map.of());
	}
}

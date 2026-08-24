package com.rtta.dorriss.summary;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.rtta.dorriss.ai.AiPromptRequest;
import com.rtta.dorriss.ai.AiServiceUnavailableException;
import com.rtta.dorriss.ai.AiTextResult;
import com.rtta.dorriss.ai.GeminiProperties;
import com.rtta.dorriss.ai.ResearchAiProvider;
import com.rtta.dorriss.ai.VersionedPromptLoader;
import com.rtta.dorriss.bookmark.Bookmark;
import com.rtta.dorriss.bookmark.BookmarkRepository;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.meeting.MeetingStatus;
import com.rtta.dorriss.note.ResearchNote;
import com.rtta.dorriss.note.ResearchNoteRepository;
import com.rtta.dorriss.summary.api.MeetingSummaryResponse;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MeetingSummaryService {

	private static final Logger LOGGER = LoggerFactory.getLogger(MeetingSummaryService.class);
	private static final String CHUNK_PROMPT = "prompts/summary-chunk-v1.md";
	private static final String FINAL_PROMPT = "prompts/meeting-summary-v1.md";
	private static final String PROMPT_VERSION = "meeting-summary-v1";

	private final MeetingRepository meetingRepository;
	private final TranscriptUtteranceRepository utteranceRepository;
	private final BookmarkRepository bookmarkRepository;
	private final ResearchNoteRepository noteRepository;
	private final MeetingSummaryRepository summaryRepository;
	private final TranscriptSummaryChunker chunker;
	private final SummaryOutputPolicy outputPolicy;
	private final VersionedPromptLoader promptLoader;
	private final ResearchAiProvider aiProvider;
	private final GeminiProperties properties;
	private final Clock clock;

	@Autowired
	public MeetingSummaryService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			ResearchNoteRepository noteRepository,
			MeetingSummaryRepository summaryRepository,
			TranscriptSummaryChunker chunker,
			SummaryOutputPolicy outputPolicy,
			VersionedPromptLoader promptLoader,
			ResearchAiProvider aiProvider,
			GeminiProperties properties) {
		this(meetingRepository, utteranceRepository, bookmarkRepository, noteRepository,
				summaryRepository, chunker, outputPolicy, promptLoader, aiProvider,
				properties, Clock.systemUTC());
	}

	MeetingSummaryService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			ResearchNoteRepository noteRepository,
			MeetingSummaryRepository summaryRepository,
			TranscriptSummaryChunker chunker,
			SummaryOutputPolicy outputPolicy,
			VersionedPromptLoader promptLoader,
			ResearchAiProvider aiProvider,
			GeminiProperties properties,
			Clock clock) {
		this.meetingRepository = meetingRepository;
		this.utteranceRepository = utteranceRepository;
		this.bookmarkRepository = bookmarkRepository;
		this.noteRepository = noteRepository;
		this.summaryRepository = summaryRepository;
		this.chunker = chunker;
		this.outputPolicy = outputPolicy;
		this.promptLoader = promptLoader;
		this.aiProvider = aiProvider;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public Optional<MeetingSummaryResponse> latest(UUID meetingId) {
		requireMeeting(meetingId);
		return summaryRepository.findFirstByMeetingIdOrderByCreatedAtDescIdDesc(meetingId)
				.map(MeetingSummaryResponse::from);
	}

	public MeetingSummaryResponse generate(UUID meetingId) {
		Meeting meeting = requireMeeting(meetingId);
		if (meeting.getStatus() == MeetingStatus.LIVE) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Finish the meeting before generating its summary");
		}
		List<TranscriptUtterance> utterances =
				utteranceRepository.findAllByMeetingIdOrderByOrdinalAsc(meetingId);
		if (utterances.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"A persisted transcript is required before generating a summary");
		}
		List<Bookmark> bookmarks =
				bookmarkRepository.findAllByMeetingIdOrderByOffsetMsAscCreatedAtAscIdAsc(meetingId);
		List<ResearchNote> notes =
				noteRepository.findAllByMeetingIdOrderByCreatedAtAscIdAsc(meetingId);
		List<TranscriptSummaryChunk> chunks = chunker.chunk(utterances);
		String model = properties.requiredModel();

		try {
			List<String> chronologicalMaterial = chunks.size() == 1
					? List.of(chunks.getFirst().content())
					: summarizeChunks(meeting, chunks, model);
			String userPrompt = finalUserPrompt(
					meeting, chronologicalMaterial, chunks.size() > 1, utterances, bookmarks, notes);
			AiTextResult result = aiProvider.summarizeMeeting(new AiPromptRequest(
					model,
					promptLoader.load(FINAL_PROMPT),
					userPrompt,
					6_000));
			String markdown = outputPolicy.requireResearchSummary(result.markdown());
			Map<String, Object> metadata = new LinkedHashMap<>();
			metadata.put("promptVersion", PROMPT_VERSION);
			metadata.put("strategy", chunks.size() == 1 ? "DIRECT" : "HIERARCHICAL");
			metadata.put("chunkCount", chunks.size());
			metadata.put("utteranceCount", utterances.size());
			metadata.put("bookmarkCount", bookmarks.size());
			metadata.put("noteCount", notes.size());
			MeetingSummary saved = summaryRepository.save(new MeetingSummary(
					meetingId,
					result.model(),
					markdown,
					metadata,
					clock.instant()));
			return MeetingSummaryResponse.from(saved);
		}
		catch (ResponseStatusException exception) {
			throw exception;
		}
		catch (RuntimeException exception) {
			LOGGER.warn("RTTA AI summaryFailed meeting={} model={} cause={}",
					meetingId, model, exception.getClass().getSimpleName());
			throw new AiServiceUnavailableException();
		}
	}

	private List<String> summarizeChunks(
			Meeting meeting,
			List<TranscriptSummaryChunk> chunks,
			String model) {
		String systemPrompt = promptLoader.load(CHUNK_PROMPT);
		List<String> summaries = new ArrayList<>(chunks.size());
		for (TranscriptSummaryChunk chunk : chunks) {
			String prompt = """
					Meeting: %s
					Languages: %s -> %s
					Chronological chunk %d of %d (%d-%d ms, %d utterances):

					%s
					""".formatted(
					meeting.getTitle(),
					meeting.getSourceLanguage(),
					meeting.getTargetLanguage(),
					chunk.index() + 1,
					chunks.size(),
					chunk.startOffsetMs(),
					chunk.endOffsetMs(),
					chunk.utteranceCount(),
					chunk.content());
			AiTextResult result = aiProvider.summarizeMeeting(
					new AiPromptRequest(model, systemPrompt, prompt, 2_500));
			if (result.markdown() == null || result.markdown().isBlank()) {
				throw new IllegalStateException("Intermediate summary was empty");
			}
			summaries.add("## Phần %d/%d\n%s".formatted(
					chunk.index() + 1, chunks.size(), result.markdown().trim()));
		}
		return List.copyOf(summaries);
	}

	private String finalUserPrompt(
			Meeting meeting,
			List<String> chronologicalMaterial,
			boolean intermediateSummaries,
			List<TranscriptUtterance> utterances,
			List<Bookmark> bookmarks,
			List<ResearchNote> notes) {
		Map<UUID, TranscriptUtterance> byId = new LinkedHashMap<>();
		utterances.forEach(utterance -> byId.put(utterance.getId(), utterance));
		StringBuilder prompt = new StringBuilder();
		prompt.append("Meeting title: ").append(meeting.getTitle()).append('\n');
		prompt.append("Languages: ").append(meeting.getSourceLanguage())
				.append(" -> ").append(meeting.getTargetLanguage()).append('\n');
		prompt.append("Transcript material type: ")
				.append(intermediateSummaries ? "chronological intermediate summaries" : "complete transcript")
				.append("\n\n## Chronological meeting material\n\n")
				.append(String.join("\n\n", chronologicalMaterial));
		prompt.append("\n\n## Bookmarked meeting moments\n\n");
		if (bookmarks.isEmpty()) {
			prompt.append("None.\n");
		}
		for (Bookmark bookmark : bookmarks) {
			TranscriptUtterance utterance = byId.get(bookmark.getUtteranceId());
			prompt.append("- [").append(bookmark.getOffsetMs()).append(" ms]");
			if (bookmark.getLabel() != null) prompt.append(" ").append(bookmark.getLabel());
			if (utterance != null) {
				prompt.append("\n  EN: ").append(utterance.getSourceText())
						.append("\n  VI: ").append(utterance.getTranslatedText());
			}
			prompt.append('\n');
		}
		prompt.append("\n## User research notes\n\n");
		if (notes.isEmpty()) {
			prompt.append("None.\n");
		}
		for (ResearchNote note : notes) {
			TranscriptUtterance utterance = byId.get(note.getUtteranceId());
			prompt.append("- ").append(note.getContent());
			if (utterance != null) {
				prompt.append("\n  Linked moment [").append(utterance.getOffsetMs())
						.append(" ms]: ").append(utterance.getTranslatedText());
			}
			prompt.append('\n');
		}
		return prompt.toString();
	}

	private Meeting requireMeeting(UUID meetingId) {
		return meetingRepository.findById(meetingId)
				.orElseThrow(() -> new MeetingNotFoundException(meetingId));
	}
}

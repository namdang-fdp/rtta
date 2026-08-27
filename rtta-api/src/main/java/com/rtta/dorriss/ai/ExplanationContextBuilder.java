package com.rtta.dorriss.ai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.rtta.dorriss.bookmark.Bookmark;
import com.rtta.dorriss.bookmark.BookmarkRepository;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.note.ResearchNote;
import com.rtta.dorriss.note.ResearchNoteRepository;
import com.rtta.dorriss.transcript.TranscriptNotFoundException;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ExplanationContextBuilder {

	static final String PROMPT_VERSION = "explain-concept-v1";

	private final MeetingRepository meetingRepository;
	private final TranscriptUtteranceRepository utteranceRepository;
	private final BookmarkRepository bookmarkRepository;
	private final ResearchNoteRepository noteRepository;
	private final AiExplanationRepository explanationRepository;
	private final Optional<ResearchContextRetriever> contextRetriever;

	public ExplanationContextBuilder(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			ResearchNoteRepository noteRepository,
			AiExplanationRepository explanationRepository,
			Optional<ResearchContextRetriever> contextRetriever) {
		this.meetingRepository = meetingRepository;
		this.utteranceRepository = utteranceRepository;
		this.bookmarkRepository = bookmarkRepository;
		this.noteRepository = noteRepository;
		this.explanationRepository = explanationRepository;
		this.contextRetriever = contextRetriever;
	}

	@Transactional(readOnly = true)
	public BuiltExplanationContext build(
			UUID meetingId,
			UUID utteranceId,
			String selectedText,
			String userQuestion) {
		Meeting meeting = meetingRepository.findById(meetingId)
				.orElseThrow(() -> new MeetingNotFoundException(meetingId));
		TranscriptUtterance target = utteranceRepository.findByIdAndMeetingId(utteranceId, meetingId)
				.orElseThrow(() -> new TranscriptNotFoundException(utteranceId));

		List<TranscriptUtterance> previous = new ArrayList<>(utteranceRepository
				.findTop5ByMeetingIdAndOrdinalLessThanOrderByOrdinalDesc(meetingId, target.getOrdinal()));
		Collections.reverse(previous);
		List<TranscriptUtterance> following = utteranceRepository
				.findTop2ByMeetingIdAndOrdinalGreaterThanOrderByOrdinalAsc(meetingId, target.getOrdinal());
		List<ResearchNote> notes = noteRepository
				.findAllByMeetingIdAndUtteranceIdOrderByCreatedAtAscIdAsc(meetingId, utteranceId);
		Bookmark bookmark = bookmarkRepository.findByMeetingIdAndUtteranceId(meetingId, utteranceId)
				.orElse(null);
		List<AiExplanation> previousExplanations = explanationRepository
				.findAllByMeetingIdAndUtteranceIdOrderByCreatedAtAscIdAsc(meetingId, utteranceId);

		String retrievalQuery = String.join("\n", List.of(
				selectedText,
				userQuestion == null ? "" : userQuestion,
				target.getSourceText(),
				target.getTranslatedText()));
		List<ResearchContextChunk> documents = contextRetriever
				.map(retriever -> retriever.retrieve(meetingId, retrievalQuery, 5))
				.orElseGet(List::of);

		Map<String, Object> meetingSnapshot = new LinkedHashMap<>();
		meetingSnapshot.put("id", meeting.getId().toString());
		meetingSnapshot.put("title", meeting.getTitle());
		meetingSnapshot.put("sourceLanguage", meeting.getSourceLanguage());
		meetingSnapshot.put("targetLanguage", meeting.getTargetLanguage());

		Map<String, Object> annotationSnapshot = new LinkedHashMap<>();
		if (bookmark != null) {
			Map<String, Object> bookmarkSnapshot = new LinkedHashMap<>();
			bookmarkSnapshot.put("id", bookmark.getId().toString());
			if (bookmark.getLabel() != null) bookmarkSnapshot.put("label", bookmark.getLabel());
			annotationSnapshot.put("bookmark", bookmarkSnapshot);
		}
		annotationSnapshot.put("notes", notes.stream().map(ResearchNote::getContent).toList());

		List<Map<String, Object>> documentSnapshot = documents.stream()
				.map(this::documentMap)
				.toList();
		Map<String, Object> snapshot = new LinkedHashMap<>();
		snapshot.put("promptVersion", PROMPT_VERSION);
		snapshot.put("meeting", meetingSnapshot);
		snapshot.put("selectedText", selectedText);
		if (userQuestion != null) snapshot.put("userQuestion", userQuestion);
		snapshot.put("previousUtterances", previous.stream().map(this::utteranceMap).toList());
		snapshot.put("targetUtterance", utteranceMap(target));
		snapshot.put("followingUtterances", following.stream().map(this::utteranceMap).toList());
		snapshot.put("annotations", annotationSnapshot);
		snapshot.put("previousExplanations", previousExplanations.stream().map(this::explanationMap).toList());
		snapshot.put("documents", documentSnapshot);

		List<Map<String, Object>> citations = documents.stream().map(this::citationMap).toList();
		return new BuiltExplanationContext(
				Map.copyOf(snapshot),
				buildPrompt(meeting, selectedText, userQuestion, previous, target, following, notes, bookmark, previousExplanations, documents),
				citations,
				previous.size(),
				following.size(),
				documents.size());
	}

	private String buildPrompt(
			Meeting meeting,
			String selectedText,
			String userQuestion,
			List<TranscriptUtterance> previous,
			TranscriptUtterance target,
			List<TranscriptUtterance> following,
			List<ResearchNote> notes,
			Bookmark bookmark,
			List<AiExplanation> previousExplanations,
			List<ResearchContextChunk> documents) {
		StringBuilder prompt = new StringBuilder();
		prompt.append("Hãy giải thích khái niệm được chọn bằng tiếng Việt.\n\n")
				.append("Khái niệm / đoạn được chọn: ").append(selectedText).append('\n');
		if (userQuestion != null) prompt.append("Câu hỏi cụ thể: ").append(userQuestion).append('\n');
		prompt.append("Tiêu đề cuộc họp: ").append(meeting.getTitle()).append('\n')
				.append("Ngôn ngữ: ").append(meeting.getSourceLanguage())
				.append(" → ").append(meeting.getTargetLanguage()).append("\n\n")
				.append("<MEETING_CONTEXT>\n");
		for (TranscriptUtterance utterance : previous) appendUtterance(prompt, "Trước", utterance);
		appendUtterance(prompt, "Mục tiêu", target);
		for (TranscriptUtterance utterance : following) appendUtterance(prompt, "Sau", utterance);
		prompt.append("</MEETING_CONTEXT>\n");

		if (bookmark != null || !notes.isEmpty()) {
			prompt.append("\n<USER_ANNOTATIONS>\n");
			if (bookmark != null && bookmark.getLabel() != null) {
				prompt.append("Bookmark: ").append(bookmark.getLabel()).append('\n');
			}
			for (ResearchNote note : notes) prompt.append("Ghi chú: ").append(note.getContent()).append('\n');
			prompt.append("</USER_ANNOTATIONS>\n");
		}

		if (!previousExplanations.isEmpty()) {
			prompt.append("\n<PREVIOUS_EXPLANATIONS>\n");
			previousExplanations.stream()
					.skip(Math.max(0, previousExplanations.size() - 6L))
					.forEach(explanation -> {
						prompt.append("Người dùng: ")
								.append(explanation.getUserQuestion() == null
										? "Giải thích đoạn này"
										: explanation.getUserQuestion())
								.append('\n')
								.append("RTTA: ").append(explanation.getResponseMarkdown()).append('\n');
					});
			prompt.append("</PREVIOUS_EXPLANATIONS>\n");
		}

		if (!documents.isEmpty()) {
			prompt.append("\n<DOCUMENT_CONTEXT>\n");
			for (int index = 0; index < documents.size(); index++) {
				ResearchContextChunk chunk = documents.get(index);
				prompt.append("[").append(index + 1).append("] ")
						.append(chunk.fileName()).append("\n")
						.append(chunk.content()).append("\n");
			}
			prompt.append("</DOCUMENT_CONTEXT>\n");
		}
		return prompt.toString();
	}

	private void appendUtterance(StringBuilder prompt, String role, TranscriptUtterance utterance) {
		prompt.append(role).append(" [").append(utterance.getOffsetMs()).append(" ms]\n")
				.append("EN: ").append(utterance.getSourceText()).append('\n')
				.append("VI: ").append(utterance.getTranslatedText()).append('\n');
	}

	private Map<String, Object> utteranceMap(TranscriptUtterance utterance) {
		return Map.of(
				"id", utterance.getId().toString(),
				"ordinal", utterance.getOrdinal(),
				"sourceText", utterance.getSourceText(),
				"translatedText", utterance.getTranslatedText(),
				"offsetMs", utterance.getOffsetMs());
	}

	private Map<String, Object> documentMap(ResearchContextChunk chunk) {
		Map<String, Object> value = new LinkedHashMap<>();
		value.put("documentId", chunk.documentId().toString());
		value.put("fileName", chunk.fileName());
		value.put("content", chunk.content());
		value.put("metadata", chunk.metadata());
		value.put("similarity", chunk.similarity());
		return value;
	}

	private Map<String, Object> explanationMap(AiExplanation explanation) {
		Map<String, Object> value = new LinkedHashMap<>();
		value.put("id", explanation.getId().toString());
		value.put("selectedText", explanation.getSelectedText());
		if (explanation.getUserQuestion() != null) value.put("userQuestion", explanation.getUserQuestion());
		value.put("responseMarkdown", explanation.getResponseMarkdown());
		return value;
	}

	private Map<String, Object> citationMap(ResearchContextChunk chunk) {
		Map<String, Object> citation = new LinkedHashMap<>();
		citation.put("type", "DOCUMENT");
		citation.put("documentId", chunk.documentId().toString());
		citation.put("fileName", chunk.fileName());
		citation.putAll(chunk.metadata());
		return citation;
	}
}

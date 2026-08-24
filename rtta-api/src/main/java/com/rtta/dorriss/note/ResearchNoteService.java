package com.rtta.dorriss.note;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.bookmark.Bookmark;
import com.rtta.dorriss.bookmark.BookmarkNotFoundException;
import com.rtta.dorriss.bookmark.BookmarkRepository;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.note.api.CreateResearchNoteRequest;
import com.rtta.dorriss.note.api.ResearchNoteResponse;
import com.rtta.dorriss.note.api.UpdateResearchNoteRequest;
import com.rtta.dorriss.transcript.TranscriptNotFoundException;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ResearchNoteService {

	private final MeetingRepository meetingRepository;
	private final TranscriptUtteranceRepository utteranceRepository;
	private final BookmarkRepository bookmarkRepository;
	private final ResearchNoteRepository noteRepository;
	private final Clock clock;

	@Autowired
	public ResearchNoteService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			ResearchNoteRepository noteRepository) {
		this(meetingRepository, utteranceRepository, bookmarkRepository, noteRepository, Clock.systemUTC());
	}

	ResearchNoteService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			ResearchNoteRepository noteRepository,
			Clock clock) {
		this.meetingRepository = meetingRepository;
		this.utteranceRepository = utteranceRepository;
		this.bookmarkRepository = bookmarkRepository;
		this.noteRepository = noteRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<ResearchNoteResponse> list(UUID meetingId) {
		requireMeeting(meetingId);
		return noteRepository.findAllByMeetingIdOrderByCreatedAtAscIdAsc(meetingId)
				.stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public ResearchNoteResponse create(UUID meetingId, CreateResearchNoteRequest request) {
		requireMeeting(meetingId);
		if (request == null) throw badRequest("Note details are required");
		String content = requireContent(request.content());

		UUID utteranceId = request.utteranceId();
		if (utteranceId != null) requireUtterance(meetingId, utteranceId);
		UUID bookmarkId = request.bookmarkId();
		if (bookmarkId != null) {
			Bookmark bookmark = bookmarkRepository.findByIdAndMeetingId(bookmarkId, meetingId)
					.orElseThrow(() -> new BookmarkNotFoundException(bookmarkId));
			if (utteranceId != null && bookmark.getUtteranceId() != null
					&& !utteranceId.equals(bookmark.getUtteranceId())) {
				throw badRequest("The bookmark and utterance refer to different meeting moments");
			}
			if (utteranceId == null) utteranceId = bookmark.getUtteranceId();
		}

		ResearchNote note = noteRepository.save(new ResearchNote(
				meetingId,
				utteranceId,
				bookmarkId,
				content,
				clock.instant()));
		return toResponse(note);
	}

	@Transactional
	public ResearchNoteResponse update(
			UUID meetingId,
			UUID noteId,
			UpdateResearchNoteRequest request) {
		requireMeeting(meetingId);
		if (request == null) throw badRequest("Note details are required");
		ResearchNote note = noteRepository.findByIdAndMeetingId(noteId, meetingId)
				.orElseThrow(() -> new ResearchNoteNotFoundException(noteId));
		note.updateContent(requireContent(request.content()), clock.instant());
		return toResponse(note);
	}

	@Transactional
	public void delete(UUID meetingId, UUID noteId) {
		requireMeeting(meetingId);
		ResearchNote note = noteRepository.findByIdAndMeetingId(noteId, meetingId)
				.orElseThrow(() -> new ResearchNoteNotFoundException(noteId));
		noteRepository.delete(note);
	}

	private ResearchNoteResponse toResponse(ResearchNote note) {
		TranscriptUtterance utterance = note.getUtteranceId() == null
				? null
				: utteranceRepository.findByIdAndMeetingId(note.getUtteranceId(), note.getMeetingId())
						.orElse(null);
		Long offsetMs = utterance == null ? bookmarkOffset(note) : Long.valueOf(utterance.getOffsetMs());
		return ResearchNoteResponse.from(
				note,
				offsetMs,
				utterance == null ? null : utterance.getSourceText(),
				utterance == null ? null : utterance.getTranslatedText());
	}

	private Long bookmarkOffset(ResearchNote note) {
		if (note.getBookmarkId() == null) return null;
		return bookmarkRepository.findByIdAndMeetingId(note.getBookmarkId(), note.getMeetingId())
				.map(Bookmark::getOffsetMs)
				.orElse(null);
	}

	private void requireMeeting(UUID meetingId) {
		if (!meetingRepository.existsById(meetingId)) throw new MeetingNotFoundException(meetingId);
	}

	private void requireUtterance(UUID meetingId, UUID utteranceId) {
		if (utteranceRepository.findByIdAndMeetingId(utteranceId, meetingId).isEmpty()) {
			throw new TranscriptNotFoundException(utteranceId);
		}
	}

	private String requireContent(String content) {
		if (content == null || content.trim().isEmpty()) throw badRequest("Note content must not be blank");
		return content.trim();
	}

	private ResponseStatusException badRequest(String reason) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
	}
}

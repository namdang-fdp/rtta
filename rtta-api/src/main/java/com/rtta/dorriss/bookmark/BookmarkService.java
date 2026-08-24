package com.rtta.dorriss.bookmark;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.bookmark.api.BookmarkResponse;
import com.rtta.dorriss.bookmark.api.CreateBookmarkRequest;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.transcript.TranscriptNotFoundException;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookmarkService {

	private final MeetingRepository meetingRepository;
	private final TranscriptUtteranceRepository utteranceRepository;
	private final BookmarkRepository bookmarkRepository;
	private final Clock clock;

	@Autowired
	public BookmarkService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository) {
		this(meetingRepository, utteranceRepository, bookmarkRepository, Clock.systemUTC());
	}

	BookmarkService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			Clock clock) {
		this.meetingRepository = meetingRepository;
		this.utteranceRepository = utteranceRepository;
		this.bookmarkRepository = bookmarkRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<BookmarkResponse> list(UUID meetingId) {
		requireMeeting(meetingId);
		return bookmarkRepository.findAllByMeetingIdOrderByOffsetMsAscCreatedAtAscIdAsc(meetingId)
				.stream()
				.map(BookmarkResponse::from)
				.toList();
	}

	@Transactional
	public BookmarkResponse create(UUID meetingId, CreateBookmarkRequest request) {
		requireMeeting(meetingId);
		if (request == null) {
			throw badRequest("Bookmark details are required");
		}

		UUID utteranceId = request.utteranceId();
		Long offsetMs = request.offsetMs();
		if (utteranceId != null) {
			TranscriptUtterance utterance = utteranceRepository
					.findByIdAndMeetingId(utteranceId, meetingId)
					.orElseThrow(() -> new TranscriptNotFoundException(utteranceId));
			long utteranceOffsetMs = utterance.getOffsetMs();
			return bookmarkRepository.findByMeetingIdAndUtteranceId(meetingId, utteranceId)
					.map(BookmarkResponse::from)
					.orElseGet(() -> BookmarkResponse.from(bookmarkRepository.save(new Bookmark(
							meetingId,
							utteranceId,
							utteranceOffsetMs,
							request.label(),
							clock.instant(),
							Map.of()))));
		}
		if (offsetMs == null || offsetMs < 0) {
			throw badRequest("A non-negative offsetMs is required when utteranceId is absent");
		}
		return BookmarkResponse.from(bookmarkRepository.save(new Bookmark(
				meetingId,
				null,
				offsetMs,
				request.label(),
				clock.instant(),
				Map.of())));
	}

	@Transactional
	public void delete(UUID meetingId, UUID bookmarkId) {
		requireMeeting(meetingId);
		Bookmark bookmark = bookmarkRepository.findByIdAndMeetingId(bookmarkId, meetingId)
				.orElseThrow(() -> new BookmarkNotFoundException(bookmarkId));
		bookmarkRepository.delete(bookmark);
	}

	private void requireMeeting(UUID meetingId) {
		if (!meetingRepository.existsById(meetingId)) {
			throw new MeetingNotFoundException(meetingId);
		}
	}

	private ResponseStatusException badRequest(String reason) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
	}
}

package com.rtta.dorriss.meeting;

import java.util.UUID;

import com.rtta.dorriss.api.PageResponse;
import com.rtta.dorriss.bookmark.BookmarkRepository;
import com.rtta.dorriss.meeting.api.MeetingResponse;
import com.rtta.dorriss.note.ResearchNoteRepository;
import com.rtta.dorriss.recording.RecordingRepository;
import com.rtta.dorriss.recording.RecordingStatus;
import com.rtta.dorriss.summary.MeetingSummaryRepository;
import com.rtta.dorriss.transcript.TranscriptNotFoundException;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
import com.rtta.dorriss.transcript.api.TranscriptUtteranceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetingHistoryService {

	private static final int MAX_PAGE_SIZE = 100;

	private final MeetingRepository meetingRepository;
	private final TranscriptUtteranceRepository utteranceRepository;
	private final BookmarkRepository bookmarkRepository;
	private final ResearchNoteRepository noteRepository;
	private final MeetingSummaryRepository summaryRepository;
	private final RecordingRepository recordingRepository;

	public MeetingHistoryService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			BookmarkRepository bookmarkRepository,
			ResearchNoteRepository noteRepository,
			MeetingSummaryRepository summaryRepository,
			RecordingRepository recordingRepository) {
		this.meetingRepository = meetingRepository;
		this.utteranceRepository = utteranceRepository;
		this.bookmarkRepository = bookmarkRepository;
		this.noteRepository = noteRepository;
		this.summaryRepository = summaryRepository;
		this.recordingRepository = recordingRepository;
	}

	@Transactional(readOnly = true)
	public PageResponse<MeetingResponse> listMeetings(int page, int size) {
		Page<Meeting> meetings = meetingRepository.findAllByOrderByStartedAtDescIdDesc(
				PageRequest.of(normalizePage(page), normalizeSize(size)));
		return PageResponse.from(meetings, meetings.stream().map(this::toResponse).toList());
	}

	@Transactional(readOnly = true)
	public MeetingResponse getMeeting(UUID meetingId) {
		Meeting meeting = meetingRepository.findById(meetingId)
				.orElseThrow(() -> new MeetingNotFoundException(meetingId));
		return toResponse(meeting);
	}

	@Transactional(readOnly = true)
	public PageResponse<TranscriptUtteranceResponse> getTranscript(
			UUID meetingId,
			String query,
			int page,
			int size) {
		if (!meetingRepository.existsById(meetingId)) {
			throw new MeetingNotFoundException(meetingId);
		}
		String cleanedQuery = cleanQuery(query);
		Sort order = Sort.by("offsetMs").ascending()
				.and(Sort.by("ordinal").ascending())
				.and(Sort.by("id").ascending());
		PageRequest pageRequest = PageRequest.of(normalizePage(page), normalizeSize(size), order);
		Page<TranscriptUtterance> utterances = cleanedQuery == null
				? utteranceRepository.findAllByMeetingId(meetingId, pageRequest)
				: utteranceRepository.searchText(meetingId, cleanedQuery, pageRequest);
		return PageResponse.from(utterances, utterances.stream()
				.map(TranscriptUtteranceResponse::from)
				.toList());
	}

	@Transactional(readOnly = true)
	public TranscriptUtteranceResponse getUtterance(UUID meetingId, UUID utteranceId) {
		if (!meetingRepository.existsById(meetingId)) {
			throw new MeetingNotFoundException(meetingId);
		}
		return utteranceRepository.findByIdAndMeetingId(utteranceId, meetingId)
				.map(TranscriptUtteranceResponse::from)
				.orElseThrow(() -> new TranscriptNotFoundException(utteranceId));
	}

	private int normalizePage(int page) {
		return Math.max(0, page);
	}

	private MeetingResponse toResponse(Meeting meeting) {
		UUID meetingId = meeting.getId();
		return MeetingResponse.from(
				meeting,
				utteranceRepository.countByMeetingId(meetingId),
				bookmarkRepository.countByMeetingId(meetingId),
				noteRepository.countByMeetingId(meetingId),
				summaryRepository.existsByMeetingId(meetingId),
				recordingRepository.existsByMeetingIdAndStatus(meetingId, RecordingStatus.READY));
	}

	private int normalizeSize(int size) {
		return Math.max(1, Math.min(MAX_PAGE_SIZE, size));
	}

	private String cleanQuery(String query) {
		if (query == null) return null;
		String cleaned = query.trim();
		return cleaned.isEmpty() ? null : cleaned;
	}
}

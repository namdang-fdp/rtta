package com.rtta.dorriss.meeting.api;

import java.util.UUID;

import com.rtta.dorriss.api.PageResponse;
import com.rtta.dorriss.meeting.MeetingHistoryService;
import com.rtta.dorriss.transcript.api.TranscriptUtteranceResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings")
public class MeetingHistoryController {

	private final MeetingHistoryService historyService;

	public MeetingHistoryController(MeetingHistoryService historyService) {
		this.historyService = historyService;
	}

	@GetMapping
	public PageResponse<MeetingResponse> listMeetings(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return historyService.listMeetings(page, size);
	}

	@GetMapping("/{meetingId}")
	public MeetingResponse getMeeting(@PathVariable UUID meetingId) {
		return historyService.getMeeting(meetingId);
	}

	@GetMapping("/{meetingId}/transcript")
	public PageResponse<TranscriptUtteranceResponse> getTranscript(
			@PathVariable UUID meetingId,
			@RequestParam(required = false) String query,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "100") int size) {
		return historyService.getTranscript(meetingId, query, page, size);
	}

	@GetMapping("/{meetingId}/transcript/{utteranceId}")
	public TranscriptUtteranceResponse getUtterance(
			@PathVariable UUID meetingId,
			@PathVariable UUID utteranceId) {
		return historyService.getUtterance(meetingId, utteranceId);
	}
}

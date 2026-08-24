package com.rtta.dorriss.summary.api;

import java.util.UUID;

import com.rtta.dorriss.summary.MeetingSummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings/{meetingId}/summary")
public class MeetingSummaryController {

	private final MeetingSummaryService summaryService;

	public MeetingSummaryController(MeetingSummaryService summaryService) {
		this.summaryService = summaryService;
	}

	@GetMapping
	public ResponseEntity<MeetingSummaryResponse> getLatest(@PathVariable UUID meetingId) {
		return summaryService.latest(meetingId)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.noContent().build());
	}

	@PostMapping
	public MeetingSummaryResponse generate(@PathVariable UUID meetingId) {
		return summaryService.generate(meetingId);
	}
}

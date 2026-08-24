package com.rtta.dorriss.recording.api;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.recording.MeetingRecordingService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings/{meetingId}/recordings")
public class MeetingRecordingController {

	private final MeetingRecordingService recordingService;

	public MeetingRecordingController(MeetingRecordingService recordingService) {
		this.recordingService = recordingService;
	}

	@GetMapping
	public List<RecordingResponse> list(@PathVariable UUID meetingId) {
		return recordingService.list(meetingId);
	}

	@PostMapping
	public RecordingResponse start(@PathVariable UUID meetingId) {
		return recordingService.start(meetingId);
	}

	@PostMapping("/{recordingId}/stop")
	public RecordingResponse stop(
			@PathVariable UUID meetingId,
			@PathVariable UUID recordingId) {
		return recordingService.stop(meetingId, recordingId);
	}

	@GetMapping("/{recordingId}/play")
	public ResponseEntity<Void> play(
			@PathVariable UUID meetingId,
			@PathVariable UUID recordingId) {
		URI url = recordingService.playbackUrl(meetingId, recordingId);
		return ResponseEntity.status(302)
				.header(HttpHeaders.LOCATION, url.toString())
				.header(HttpHeaders.CACHE_CONTROL, "no-store")
				.build();
	}
}

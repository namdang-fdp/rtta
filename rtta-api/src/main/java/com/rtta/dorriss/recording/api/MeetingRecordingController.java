package com.rtta.dorriss.recording.api;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.rtta.dorriss.recording.MeetingRecordingService;
import com.rtta.dorriss.recording.MeetingRecordingService.RecordingContent;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/meetings/{meetingId}/recordings")
public class MeetingRecordingController {
	private static final Pattern SINGLE_RANGE = Pattern.compile("bytes=(\\d*)-(\\d*)");

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
	public ResponseEntity<StreamingResponseBody> play(
			@PathVariable UUID meetingId,
			@PathVariable UUID recordingId,
			@RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
		RecordingContent content = recordingService.content(meetingId, recordingId);
		ByteRange range = parseRange(rangeHeader, content.size());
		if (range == null && rangeHeader != null) {
			return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
					.header(HttpHeaders.ACCEPT_RANGES, "bytes")
					.header(HttpHeaders.CONTENT_RANGE, "bytes */" + content.size())
					.build();
		}
		long start = range == null ? 0 : range.start();
		long length = range == null ? content.size() : range.length();
		StreamingResponseBody body = output -> {
			try (InputStream input = recordingService.open(content, start, length)) {
				byte[] buffer = new byte[64 * 1024];
				long remaining = length;
				while (remaining > 0) {
					int read = input.read(buffer, 0, (int) Math.min(buffer.length, remaining));
					if (read < 0) break;
					output.write(buffer, 0, read);
					remaining -= read;
				}
			}
		};
		ResponseEntity.BodyBuilder response = ResponseEntity
				.status(range == null ? HttpStatus.OK : HttpStatus.PARTIAL_CONTENT)
				.header(HttpHeaders.ACCEPT_RANGES, "bytes")
				.header(HttpHeaders.CACHE_CONTROL, "private, no-store")
				.contentType(MediaType.parseMediaType("audio/wav"))
				.contentLength(length);
		if (range != null) {
			response.header(HttpHeaders.CONTENT_RANGE,
					"bytes " + range.start() + "-" + range.end() + "/" + content.size());
		}
		return response.body(body);
	}

	private ByteRange parseRange(String value, long size) {
		if (value == null) return null;
		Matcher matcher = SINGLE_RANGE.matcher(value.trim());
		if (!matcher.matches() || size <= 0) return null;
		try {
			String first = matcher.group(1);
			String last = matcher.group(2);
			if (first.isEmpty() && last.isEmpty()) return null;
			long start;
			long end;
			if (first.isEmpty()) {
				long suffixLength = Long.parseLong(last);
				if (suffixLength <= 0) return null;
				start = Math.max(0, size - suffixLength);
				end = size - 1;
			}
			else {
				start = Long.parseLong(first);
				end = last.isEmpty() ? size - 1 : Long.parseLong(last);
				if (start >= size || end < start) return null;
				end = Math.min(end, size - 1);
			}
			return new ByteRange(start, end);
		}
		catch (NumberFormatException exception) {
			return null;
		}
	}

	private record ByteRange(long start, long end) {
		long length() { return end - start + 1; }
	}
}

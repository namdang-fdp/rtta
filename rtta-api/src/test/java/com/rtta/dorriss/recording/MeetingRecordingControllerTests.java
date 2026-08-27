package com.rtta.dorriss.recording;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

import com.rtta.dorriss.recording.MeetingRecordingService.RecordingContent;
import com.rtta.dorriss.recording.api.MeetingRecordingController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class MeetingRecordingControllerTests {

	private final MeetingRecordingService service = mock(MeetingRecordingService.class);
	private final MeetingRecordingController controller = new MeetingRecordingController(service);
	private UUID meetingId;
	private UUID recordingId;

	@BeforeEach
	void setUp() {
		meetingId = UUID.randomUUID();
		recordingId = UUID.randomUUID();
	}

	@Test
	void fullGetStreamsWith200AndNoPrivateRedirect() throws Exception {
		byte[] wav = "0123456789".getBytes();
		RecordingContent content = new RecordingContent("private/key.wav", wav.length);
		when(service.content(meetingId, recordingId)).thenReturn(content);
		when(service.open(content, 0, wav.length)).thenReturn(new ByteArrayInputStream(wav));

		ResponseEntity<StreamingResponseBody> response = controller.play(meetingId, recordingId, null);
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getHeaders().getContentLength()).isEqualTo(wav.length);
		assertThat(response.getHeaders().getFirst(HttpHeaders.ACCEPT_RANGES)).isEqualTo("bytes");
		assertThat(response.getHeaders().getLocation()).isNull();
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		response.getBody().writeTo(output);
		assertThat(output.toByteArray()).containsExactly(wav);
	}

	@Test
	void validRangeReturnsExact206HeadersAndBytes() throws Exception {
		byte[] wav = "0123456789".getBytes();
		RecordingContent content = new RecordingContent("private/key.wav", wav.length);
		when(service.content(meetingId, recordingId)).thenReturn(content);
		when(service.open(content, 2, 4)).thenReturn(new ByteArrayInputStream("2345-extra".getBytes()));

		ResponseEntity<StreamingResponseBody> response = controller.play(meetingId, recordingId, "bytes=2-5");
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PARTIAL_CONTENT);
		assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE)).isEqualTo("bytes 2-5/10");
		assertThat(response.getHeaders().getContentLength()).isEqualTo(4);
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		response.getBody().writeTo(output);
		assertThat(output.toString()).isEqualTo("2345");
	}

	@Test
	void invalidAndMultipleRangesReturn416() {
		RecordingContent content = new RecordingContent("private/key.wav", 10);
		when(service.content(meetingId, recordingId)).thenReturn(content);

		ResponseEntity<StreamingResponseBody> invalid = controller.play(meetingId, recordingId, "bytes=20-30");
		ResponseEntity<StreamingResponseBody> multiple = controller.play(meetingId, recordingId, "bytes=0-1,4-5");
		assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
		assertThat(invalid.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE)).isEqualTo("bytes */10");
		assertThat(multiple.getStatusCode()).isEqualTo(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
	}

	@Test
	void largeObjectIsOpenedOnlyWhenStreamingBegins() {
		RecordingContent content = new RecordingContent("private/five-hours.wav", 576_000_000L);
		when(service.content(meetingId, recordingId)).thenReturn(content);

		ResponseEntity<StreamingResponseBody> response = controller.play(meetingId, recordingId, null);
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getHeaders().getContentLength()).isEqualTo(576_000_000L);
		verify(service, never()).open(content, 0, 576_000_000L);
	}
}

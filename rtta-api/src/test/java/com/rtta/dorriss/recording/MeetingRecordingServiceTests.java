package com.rtta.dorriss.recording;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.SyncTaskExecutor;

@ExtendWith(MockitoExtension.class)
class MeetingRecordingServiceTests {

	@Mock MeetingRepository meetingRepository;
	@Mock RecordingRepository recordingRepository;
	@Mock RecordingStorage storage;
	@TempDir Path tempDirectory;

	private final Instant now = Instant.parse("2026-08-25T01:00:00Z");
	private Meeting meeting;
	private MeetingRecordingService service;

	@BeforeEach
	void setUp() {
		meeting = Meeting.start(UUID.randomUUID(), "Seminar", "en-US", "vi-VN",
				now.minusSeconds(60), now.minusSeconds(60), Map.of());
		when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
		when(recordingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
		service = new MeetingRecordingService(
				meetingRepository, recordingRepository, storage, new SyncTaskExecutor(), tempDirectory,
				Clock.fixed(now, ZoneOffset.UTC));
	}

	@Test
	void streamsPcmToWavUploadsItAndDeletesTheTemporaryFile() throws Exception {
		var started = service.start(meeting.getId());
		service.acceptPcm(meeting.getId(), new byte[32_000]);
		doAnswer(invocation -> {
			Path wav = invocation.getArgument(1);
			assertThat(Files.size(wav)).isEqualTo(32_044);
			assertThat(new String(Files.readAllBytes(wav), 0, 4)).isEqualTo("RIFF");
			return null;
		}).when(storage).upload(any(), any());

		var stopped = service.stop(meeting.getId(), started.id());

		assertThat(stopped.status()).isEqualTo(RecordingStatus.READY);
		assertThat(stopped.durationMs()).isEqualTo(1_000);
		assertThat(stopped.sizeBytes()).isEqualTo(32_044);
		verify(storage).upload(any(), any());
		try (var files = Files.list(tempDirectory)) {
			assertThat(files).isEmpty();
		}
	}

	@Test
	void storageFailureMarksRecordingFailedWithoutEscapingTheControlPath() {
		var started = service.start(meeting.getId());
		service.acceptPcm(meeting.getId(), new byte[1_600]);
		doThrow(new IllegalStateException("MinIO unavailable")).when(storage).upload(any(), any());

		var stopped = service.stop(meeting.getId(), started.id());

		assertThat(stopped.status()).isEqualTo(RecordingStatus.FAILED);
	}
}

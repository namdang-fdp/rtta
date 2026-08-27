package com.rtta.dorriss.recording;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.meeting.MeetingStatus;
import com.rtta.dorriss.recording.api.RecordingResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MeetingRecordingService {

	private static final Logger LOGGER = LoggerFactory.getLogger(MeetingRecordingService.class);
	private static final int SAMPLE_RATE = 16_000;
	private static final short CHANNELS = 1;
	private static final short BITS_PER_SAMPLE = 16;

	private final MeetingRepository meetingRepository;
	private final RecordingRepository recordingRepository;
	private final RecordingStorage storage;
	private final TaskExecutor taskExecutor;
	private final Path tempDirectory;
	private final Clock clock;
	private final Map<UUID, ActiveRecording> active = new ConcurrentHashMap<>();

	@Autowired
	public MeetingRecordingService(
			MeetingRepository meetingRepository,
			RecordingRepository recordingRepository,
			RecordingStorage storage,
			TaskExecutor taskExecutor,
			@Value("${rtta.recording.temp-directory:${java.io.tmpdir}/rtta-recordings}") Path tempDirectory) {
		this(meetingRepository, recordingRepository, storage, taskExecutor, tempDirectory, Clock.systemUTC());
	}

	MeetingRecordingService(
			MeetingRepository meetingRepository,
			RecordingRepository recordingRepository,
			RecordingStorage storage,
			TaskExecutor taskExecutor,
			Path tempDirectory,
			Clock clock) {
		this.meetingRepository = meetingRepository;
		this.recordingRepository = recordingRepository;
		this.storage = storage;
		this.taskExecutor = taskExecutor;
		this.tempDirectory = tempDirectory;
		this.clock = clock;
	}

	public RecordingResponse start(UUID meetingId) {
		Meeting meeting = requireMeeting(meetingId);
		if (meeting.getStatus() != MeetingStatus.LIVE) {
			throw conflict("Recording can only start while the meeting is live");
		}
		Instant startedAt = clock.instant();
		long startOffsetMs = Math.max(0, Duration.between(meeting.getStartedAt(), startedAt).toMillis());
		String objectKey = meetingId + "/" + UUID.randomUUID() + ".wav";
		WavStreamingWriter writer;
		try {
			writer = WavStreamingWriter.create(tempDirectory, SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE);
		}
		catch (IOException exception) {
			throw unavailable("Recording could not start");
		}
		Recording recording = new Recording(
				meetingId, objectKey, "wav", SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE,
				startOffsetMs, startedAt);
		ActiveRecording capture = new ActiveRecording(recording, writer);
		if (active.putIfAbsent(meetingId, capture) != null) {
			capture.cleanup();
			throw conflict("This meeting is already being recorded");
		}
		try {
			recordingRepository.save(recording);
			return RecordingResponse.from(recording);
		}
		catch (RuntimeException exception) {
			active.remove(meetingId, capture);
			capture.cleanup();
			throw unavailable("Recording could not start");
		}
	}

	public RecordingResponse stop(UUID meetingId, UUID recordingId) {
		requireMeeting(meetingId);
		ActiveRecording capture = active.get(meetingId);
		if (capture == null || !capture.recording().getId().equals(recordingId)) {
			throw conflict("This recording is not active");
		}
		active.remove(meetingId, capture);
		return finalizeAsync(capture);
	}

	public void stopForMeeting(UUID meetingId) {
		if (meetingId == null) return;
		ActiveRecording capture = active.remove(meetingId);
		if (capture != null) finalizeAsync(capture);
	}

	public void acceptPcm(UUID meetingId, byte[] pcm) {
		if (meetingId == null) return;
		ActiveRecording capture = active.get(meetingId);
		if (capture == null) return;
		try {
			capture.append(pcm);
		}
		catch (RuntimeException exception) {
			if (active.remove(meetingId, capture)) fail(capture, "Audio write failed");
		}
	}

	public List<RecordingResponse> list(UUID meetingId) {
		requireMeeting(meetingId);
		return recordingRepository.findAllByMeetingIdOrderByStartedAtDescIdDesc(meetingId)
				.stream().map(RecordingResponse::from).toList();
	}

	public RecordingContent content(UUID meetingId, UUID recordingId) {
		requireMeeting(meetingId);
		Recording recording = recordingRepository.findByIdAndMeetingId(recordingId, meetingId)
				.orElseThrow(() -> new RecordingNotFoundException(recordingId));
		if (recording.getStatus() != RecordingStatus.READY) {
			throw conflict("Recording playback is not ready");
		}
		try {
			return new RecordingContent(recording.getObjectKey(), storage.size(recording.getObjectKey()));
		}
		catch (RuntimeException exception) {
			LOGGER.warn("RTTA RECORDING contentLookupFailed meeting={} recording={} cause={}",
					meetingId, recordingId, exception.getClass().getSimpleName());
			throw unavailable("Recording playback is temporarily unavailable");
		}
	}

	public InputStream open(RecordingContent content, long offset, long length) {
		return storage.open(content.objectKey(), offset, length);
	}

	public record RecordingContent(String objectKey, long size) { }

	private RecordingResponse finalizeAsync(ActiveRecording capture) {
		WavStreamingWriter.WavResult wav;
		Instant endedAt = clock.instant();
		try {
			wav = capture.finish();
			capture.recording().markUploading(endedAt, wav.durationMs());
			recordingRepository.save(capture.recording());
		}
		catch (RuntimeException exception) {
			fail(capture, "WAV finalization failed");
			return RecordingResponse.from(capture.recording());
		}
		try {
			taskExecutor.execute(() -> upload(capture, wav));
		}
		catch (RuntimeException exception) {
			fail(capture, "Recording upload could not be scheduled");
		}
		return RecordingResponse.from(capture.recording());
	}

	private void upload(ActiveRecording capture, WavStreamingWriter.WavResult wav) {
		try {
			storage.upload(capture.recording().getObjectKey(), wav.path());
			capture.recording().markReady(wav.sizeBytes());
			recordingRepository.save(capture.recording());
			Files.deleteIfExists(wav.path());
		}
		catch (Exception exception) {
			fail(capture, "Object storage upload failed");
		}
	}

	private void fail(ActiveRecording capture, String reason) {
		capture.cleanup();
		capture.recording().markFailed(reason, clock.instant());
		try {
			recordingRepository.save(capture.recording());
		}
		catch (RuntimeException persistenceException) {
			LOGGER.error("RTTA RECORDING failurePersistenceFailed meeting={} recording={} cause={}",
					capture.recording().getMeetingId(), capture.recording().getId(),
					persistenceException.getClass().getSimpleName());
		}
		LOGGER.warn("RTTA RECORDING failed meeting={} recording={} reason={}",
				capture.recording().getMeetingId(), capture.recording().getId(), reason);
	}

	private Meeting requireMeeting(UUID meetingId) {
		return meetingRepository.findById(meetingId)
				.orElseThrow(() -> new MeetingNotFoundException(meetingId));
	}

	private ResponseStatusException conflict(String reason) {
		return new ResponseStatusException(HttpStatus.CONFLICT, reason);
	}

	private ResponseStatusException unavailable(String reason) {
		return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, reason);
	}

	private record ActiveRecording(Recording recording, WavStreamingWriter writer) {
		void append(byte[] pcm) {
			try {
				writer.append(pcm);
			}
			catch (IOException exception) {
				throw new IllegalStateException("PCM write failed", exception);
			}
		}

		WavStreamingWriter.WavResult finish() {
			try {
				return writer.finalizeFile();
			}
			catch (IOException exception) {
				throw new IllegalStateException("WAV finalization failed", exception);
			}
		}

		void cleanup() {
			try {
				writer.close();
				Files.deleteIfExists(writer.path());
			}
			catch (IOException ignored) {
				// A later local maintenance pass may remove an orphaned temporary file.
			}
		}
	}
}

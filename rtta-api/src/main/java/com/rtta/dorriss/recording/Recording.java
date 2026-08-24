package com.rtta.dorriss.recording;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "recordings")
public class Recording {

	@Id
	private UUID id;

	@Column(name = "meeting_id", nullable = false, updatable = false)
	private UUID meetingId;

	@Column(name = "object_key", nullable = false, unique = true, updatable = false)
	private String objectKey;

	@Column(nullable = false, length = 32, updatable = false)
	private String format;

	@Column(name = "sample_rate", nullable = false, updatable = false)
	private int sampleRate;

	@Column(nullable = false, updatable = false)
	private short channels;

	@Column(name = "bits_per_sample", nullable = false, updatable = false)
	private short bitsPerSample;

	@Column(name = "recording_start_offset_ms", nullable = false, updatable = false)
	private long recordingStartOffsetMs;

	@Column(name = "started_at", nullable = false, updatable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	@Column(name = "duration_ms")
	private Long durationMs;

	@Column(name = "size_bytes")
	private Long sizeBytes;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private RecordingStatus status;

	@Column(name = "error_message", columnDefinition = "text")
	private String errorMessage;

	protected Recording() {
	}

	public Recording(
			UUID meetingId,
			String objectKey,
			String format,
			int sampleRate,
			short channels,
			short bitsPerSample,
			long recordingStartOffsetMs,
			Instant startedAt) {
		if (sampleRate <= 0 || channels <= 0 || bitsPerSample <= 0) {
			throw new IllegalArgumentException("Audio format values must be positive");
		}
		if (recordingStartOffsetMs < 0) {
			throw new IllegalArgumentException("recordingStartOffsetMs must not be negative");
		}
		this.id = UUID.randomUUID();
		this.meetingId = Objects.requireNonNull(meetingId, "meetingId");
		this.objectKey = requireText(objectKey, "objectKey");
		this.format = requireText(format, "format");
		this.sampleRate = sampleRate;
		this.channels = channels;
		this.bitsPerSample = bitsPerSample;
		this.recordingStartOffsetMs = recordingStartOffsetMs;
		this.startedAt = Objects.requireNonNull(startedAt, "startedAt");
		this.status = RecordingStatus.RECORDING;
	}

	public void markUploading(Instant endedAt, long durationMs) {
		if (durationMs < 0) throw new IllegalArgumentException("durationMs must not be negative");
		this.status = RecordingStatus.UPLOADING;
		this.endedAt = Objects.requireNonNull(endedAt, "endedAt");
		this.durationMs = durationMs;
	}

	public void markReady(long sizeBytes) {
		if (sizeBytes < 0) throw new IllegalArgumentException("sizeBytes must not be negative");
		status = RecordingStatus.READY;
		this.sizeBytes = sizeBytes;
		errorMessage = null;
	}

	public void markFailed(String message, Instant endedAt) {
		status = RecordingStatus.FAILED;
		errorMessage = requireText(message, "message");
		this.endedAt = Objects.requireNonNull(endedAt, "endedAt");
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public String getObjectKey() { return objectKey; }
	public String getFormat() { return format; }
	public int getSampleRate() { return sampleRate; }
	public short getChannels() { return channels; }
	public short getBitsPerSample() { return bitsPerSample; }
	public long getRecordingStartOffsetMs() { return recordingStartOffsetMs; }
	public Instant getStartedAt() { return startedAt; }
	public Instant getEndedAt() { return endedAt; }
	public Long getDurationMs() { return durationMs; }
	public Long getSizeBytes() { return sizeBytes; }
	public RecordingStatus getStatus() { return status; }
	public String getErrorMessage() { return errorMessage; }

	private static String requireText(String value, String name) {
		Objects.requireNonNull(value, name);
		String cleaned = value.trim();
		if (cleaned.isEmpty()) throw new IllegalArgumentException(name + " must not be blank");
		return cleaned;
	}
}

package com.rtta.dorriss.recording.api;

import java.time.Instant;
import java.util.UUID;

import com.rtta.dorriss.recording.Recording;
import com.rtta.dorriss.recording.RecordingStatus;

public record RecordingResponse(
		UUID id,
		UUID meetingId,
		String format,
		int sampleRate,
		short channels,
		short bitsPerSample,
		long recordingStartOffsetMs,
		Instant startedAt,
		Instant endedAt,
		Long durationMs,
		Long sizeBytes,
		RecordingStatus status) {

	public static RecordingResponse from(Recording recording) {
		return new RecordingResponse(
				recording.getId(), recording.getMeetingId(), recording.getFormat(),
				recording.getSampleRate(), recording.getChannels(), recording.getBitsPerSample(),
				recording.getRecordingStartOffsetMs(), recording.getStartedAt(), recording.getEndedAt(),
				recording.getDurationMs(), recording.getSizeBytes(), recording.getStatus());
	}
}

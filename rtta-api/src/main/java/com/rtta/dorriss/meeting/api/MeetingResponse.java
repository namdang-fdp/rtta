package com.rtta.dorriss.meeting.api;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingStatus;

public record MeetingResponse(
		UUID id,
		UUID liveSessionId,
		String title,
		String sourceLanguage,
		String targetLanguage,
		MeetingStatus status,
		Instant startedAt,
		Instant endedAt,
		Instant createdAt,
		Instant updatedAt,
		Map<String, Object> metadata,
		long transcriptUtteranceCount,
		long bookmarkCount,
		long noteCount,
		boolean summaryAvailable,
		boolean recordingAvailable) {

	public static MeetingResponse from(
			Meeting meeting,
			long transcriptUtteranceCount,
			long bookmarkCount,
			long noteCount,
			boolean summaryAvailable,
			boolean recordingAvailable) {
		return new MeetingResponse(
				meeting.getId(),
				meeting.getLiveSessionId(),
				meeting.getTitle(),
				meeting.getSourceLanguage(),
				meeting.getTargetLanguage(),
				meeting.getStatus(),
				meeting.getStartedAt(),
				meeting.getEndedAt(),
				meeting.getCreatedAt(),
				meeting.getUpdatedAt(),
				meeting.getMetadata(),
				transcriptUtteranceCount,
				bookmarkCount,
				noteCount,
				summaryAvailable,
				recordingAvailable);
	}
}

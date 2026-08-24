package com.rtta.dorriss.summary.api;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.summary.MeetingSummary;

public record MeetingSummaryResponse(
		UUID id,
		UUID meetingId,
		String model,
		String summaryMarkdown,
		Map<String, Object> structuredData,
		Instant createdAt) {

	public static MeetingSummaryResponse from(MeetingSummary summary) {
		return new MeetingSummaryResponse(
				summary.getId(),
				summary.getMeetingId(),
				summary.getModel(),
				summary.getSummaryMarkdown(),
				summary.getStructuredData(),
				summary.getCreatedAt());
	}
}

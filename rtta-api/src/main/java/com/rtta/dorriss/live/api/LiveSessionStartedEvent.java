package com.rtta.dorriss.live.api;

import java.time.Instant;

public record LiveSessionStartedEvent(
		String type,
		String sessionId,
		String meetingId,
		Instant startedAt) {
}

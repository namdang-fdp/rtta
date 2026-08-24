package com.rtta.dorriss.live.api;

import java.time.Instant;

public record LiveSessionStoppedEvent(
		String type,
		String sessionId,
		String meetingId,
		Instant stoppedAt) {
}

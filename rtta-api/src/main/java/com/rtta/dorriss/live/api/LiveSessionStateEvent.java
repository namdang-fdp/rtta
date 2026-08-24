package com.rtta.dorriss.live.api;

import java.time.Instant;

public record LiveSessionStateEvent(
		String type,
		LiveSessionStatus state,
		String sessionId,
		String meetingId,
		Instant startedAt) {
}

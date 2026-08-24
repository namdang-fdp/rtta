package com.rtta.dorriss.live.api;

import java.time.Instant;

public record LiveErrorEvent(
		String type,
		String sessionId,
		String message,
		Instant observedAt) {
}

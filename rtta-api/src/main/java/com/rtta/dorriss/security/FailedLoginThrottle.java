package com.rtta.dorriss.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
final class FailedLoginThrottle {

	private static final int MAX_ATTEMPTS = 5;
	private static final Duration WINDOW = Duration.ofMinutes(5);
	private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();
	private final Clock clock = Clock.systemUTC();

	boolean allow(String key) {
		return attempts.computeIfAbsent(key, ignored -> new AttemptWindow())
				.allow(clock.instant());
	}

	void failed(String key) {
		attempts.computeIfAbsent(key, ignored -> new AttemptWindow())
				.failed(clock.instant());
	}

	void succeeded(String key) {
		attempts.remove(key);
	}

	private static final class AttemptWindow {
		private final ArrayDeque<Instant> failures = new ArrayDeque<>();

		synchronized boolean allow(Instant now) {
			prune(now);
			return failures.size() < MAX_ATTEMPTS;
		}

		synchronized void failed(Instant now) {
			prune(now);
			failures.addLast(now);
		}

		private void prune(Instant now) {
			Instant cutoff = now.minus(WINDOW);
			while (!failures.isEmpty() && failures.getFirst().isBefore(cutoff)) {
				failures.removeFirst();
			}
		}
	}
}

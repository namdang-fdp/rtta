package com.rtta.dorriss.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

class LiveSessionHubTests {

	@Test
	void removesOnlyTheFailedSubscriberAndKeepsBroadcasting() throws Exception {
		LiveSessionHub hub = new LiveSessionHub(new ObjectMapper());
		WebSocketSession healthy = socket("healthy");
		WebSocketSession failed = socket("failed");
		AtomicInteger failedSends = new AtomicInteger();
		AtomicInteger healthySends = new AtomicInteger();

		doAnswer(invocation -> {
			healthySends.incrementAndGet();
			return null;
		}).when(healthy).sendMessage(any(WebSocketMessage.class));
		doAnswer(invocation -> {
			if (failedSends.incrementAndGet() > 1) {
				throw new IOException("subscriber went away");
			}
			return null;
		}).when(failed).sendMessage(any(WebSocketMessage.class));

		hub.subscribe(healthy);
		hub.subscribe(failed);
		UUID sessionId = UUID.randomUUID();
		hub.sessionStarted(sessionId, UUID.randomUUID(), Instant.parse("2026-08-25T00:00:00Z"));
		hub.publishTranslation(sessionId, translation(0), UUID.randomUUID());

		assertThat(hub.subscriberCount()).isEqualTo(1);
		assertThat(hub.activeSessionId()).isEqualTo(sessionId);
		assertThat(healthySends).hasValue(3);
	}

	@Test
	void serializesOutboundWritesFromConcurrentTranslationCallbacks() throws Exception {
		LiveSessionHub hub = new LiveSessionHub(new ObjectMapper());
		WebSocketSession socket = socket("concurrent");
		AtomicInteger inFlight = new AtomicInteger();
		AtomicInteger sends = new AtomicInteger();
		AtomicBoolean overlapped = new AtomicBoolean();

		doAnswer(invocation -> {
			if (inFlight.incrementAndGet() > 1) {
				overlapped.set(true);
			}
			try {
				sends.incrementAndGet();
				Thread.yield();
			}
			finally {
				inFlight.decrementAndGet();
			}
			return null;
		}).when(socket).sendMessage(any(WebSocketMessage.class));

		hub.subscribe(socket);
		UUID sessionId = UUID.randomUUID();
		hub.sessionStarted(sessionId, UUID.randomUUID(), Instant.parse("2026-08-25T00:00:00Z"));
		int eventCount = 40;
		CountDownLatch start = new CountDownLatch(1);
		CountDownLatch complete = new CountDownLatch(eventCount);
		ExecutorService executor = Executors.newFixedThreadPool(8);
		try {
			for (int index = 0; index < eventCount; index++) {
				int eventIndex = index;
				executor.execute(() -> {
					try {
						start.await();
						hub.publishTranslation(sessionId, translation(eventIndex), UUID.randomUUID());
					}
					catch (InterruptedException exception) {
						Thread.currentThread().interrupt();
					}
					finally {
						complete.countDown();
					}
				});
			}
			start.countDown();
			assertThat(complete.await(2, TimeUnit.SECONDS)).isTrue();
		}
		finally {
			executor.shutdownNow();
		}

		assertThat(overlapped).isFalse();
		assertThat(sends).hasValue(eventCount + 2);
	}

	private WebSocketSession socket(String id) {
		WebSocketSession socket = mock(WebSocketSession.class);
		when(socket.getId()).thenReturn(id);
		when(socket.isOpen()).thenReturn(true);
		return socket;
	}

	private TranslationEvent translation(int index) {
		return new TranslationEvent(
				index % 2 == 0 ? TranslationEventType.PARTIAL : TranslationEventType.FINAL,
				"source " + index,
				"translation " + index,
				index * 50L,
				50,
				Instant.parse("2026-08-25T00:00:00Z"));
	}
}

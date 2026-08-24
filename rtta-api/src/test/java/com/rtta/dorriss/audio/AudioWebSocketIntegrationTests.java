package com.rtta.dorriss.audio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import com.rtta.dorriss.translation.TranslationProvider;
import com.rtta.dorriss.translation.TranslationSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = {
				"spike.enabled=false",
				"rtta.translation.provider=fake"
		})
@Import(AudioWebSocketIntegrationTests.FakeProviderConfiguration.class)
class AudioWebSocketIntegrationTests {

	@LocalServerPort
	private int port;

	@Autowired
	private AudioWebSocketHandler handler;

	@Autowired
	private FakeTranslationProvider translationProvider;

	@BeforeEach
	void resetFakeProvider() {
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
				assertThat(handler.activeSessionCount()).isZero());
		translationProvider.reset();
	}

	@Test
	void startFrameAndStopOpenPushAndCloseExactlyOneTranslationSession() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();
		byte[] pcm = new byte[1_600];
		for (int index = 0; index < pcm.length; index++) {
			pcm[index] = (byte) (index % 127);
		}

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");
		assertThat(translationProvider.openCount()).isEqualTo(1);

		socket.sendBinary(ByteBuffer.wrap(pcm), true).join();
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() -> {
			assertThat(translationProvider.latestSession().frames()).hasSize(1);
			assertThat(translationProvider.latestSession().frames().getFirst()).containsExactly(pcm);
			assertThat(handler.activeSessionSnapshot(sessionId).frameCount()).isEqualTo(1);
			assertThat(handler.activeSessionSnapshot(sessionId).totalBytes()).isEqualTo(1_600);
		});
		socket.sendText("{\"type\":\"STOP\",\"sessionId\":\"" + sessionId + "\"}", true).join();
		assertThat(listener.nextText()).isEqualTo("STOPPED");
		assertThat(handler.activeSessionCount()).isZero();
		assertThat(translationProvider.latestSession().closed()).isTrue();

		socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
	}

	@Test
	void deliversPartialAndFinalTranslationJsonOnTheAudioWebSocket() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");

		translationProvider.latestSession().emit(new TranslationEvent(
				TranslationEventType.PARTIAL,
				"Pulsars are rapidly rotating...",
				"Pulsar là những...",
				1_230,
				760,
				Instant.parse("2026-08-25T00:00:00Z")));
		assertThat(listener.nextText()).isEqualTo(
				translationJson(
						sessionId,
						"PARTIAL",
						"Pulsars are rapidly rotating...",
						"Pulsar là những...",
						1_230,
						760,
						"2026-08-25T00:00:00Z"));

		translationProvider.latestSession().emit(new TranslationEvent(
				TranslationEventType.FINAL,
				"Pulsars are rapidly rotating neutron stars.",
				"Pulsar là các sao neutron quay nhanh.",
				1_230,
				2_760,
				Instant.parse("2026-08-25T00:00:02.760Z")));
		assertThat(listener.nextText()).isEqualTo(
				translationJson(
						sessionId,
						"FINAL",
						"Pulsars are rapidly rotating neutron stars.",
						"Pulsar là các sao neutron quay nhanh.",
						1_230,
						2_760,
						"2026-08-25T00:00:02.760Z"));

		socket.sendText("{\"type\":\"STOP\",\"sessionId\":\"" + sessionId + "\"}", true).join();
		assertThat(listener.nextText()).isEqualTo("STOPPED");
		socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
	}

	@Test
	void serializesTranslationCallbacksFromMultipleProviderThreads() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();
		int eventCount = 40;
		CountDownLatch start = new CountDownLatch(1);
		CountDownLatch completed = new CountDownLatch(eventCount);
		ExecutorService executor = Executors.newFixedThreadPool(8);

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");

		try {
			for (int index = 0; index < eventCount; index++) {
				int eventIndex = index;
				executor.execute(() -> {
					try {
						start.await();
						translationProvider.latestSession().emit(new TranslationEvent(
								eventIndex % 2 == 0
										? TranslationEventType.PARTIAL
										: TranslationEventType.FINAL,
								"source " + eventIndex,
								"translation " + eventIndex,
								eventIndex * 50L,
								50,
								Instant.parse("2026-08-25T00:00:00Z")));
					}
					catch (InterruptedException exception) {
						Thread.currentThread().interrupt();
					}
					finally {
						completed.countDown();
					}
				});
			}
			start.countDown();
			assertThat(completed.await(2, TimeUnit.SECONDS)).isTrue();
			assertThat(listener.nextTexts(eventCount))
					.hasSize(eventCount)
					.allSatisfy(message -> assertThat(message)
							.contains("\"type\":\"TRANSLATION\"")
							.contains("\"sessionId\":\"" + sessionId + "\""));
			assertThat(handler.activeSessionCount()).isEqualTo(1);
			assertThat(translationProvider.latestSession().closed()).isFalse();
		}
		finally {
			executor.shutdownNow();
		}

		socket.sendText("{\"type\":\"STOP\",\"sessionId\":\"" + sessionId + "\"}", true).join();
		assertThat(listener.nextText()).isEqualTo("STOPPED");
		socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
	}

	@Test
	void providerEventAfterConnectionClosureIsIgnored() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");
		FakeTranslationSession translationSession = translationProvider.latestSession();
		socket.sendClose(WebSocket.NORMAL_CLOSURE, "client closed").join();
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
				assertThat(translationSession.closed()).isTrue());

		translationSession.emit(new TranslationEvent(
				TranslationEventType.PARTIAL,
				"stale source",
				"stale translation",
				0,
				50,
				Instant.parse("2026-08-25T00:00:00Z")));

		assertThat(listener.pollText()).isNull();
		assertThat(handler.activeSessionCount()).isZero();
	}

	@Test
	void unexpectedDisconnectClosesTranslationSession() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");
		socket.sendClose(WebSocket.NORMAL_CLOSURE, "unexpected test disconnect").join();

		await().atMost(Duration.ofSeconds(2)).untilAsserted(() -> {
			assertThat(handler.activeSessionCount()).isZero();
			assertThat(translationProvider.latestSession().closed()).isTrue();
		});
	}

	@Test
	void duplicateStartDoesNotOpenAnotherTranslationSession() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");
		socket.sendText(startMessage(sessionId), true).join();

		assertThat(listener.nextText()).isEqualTo("ERROR");
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() -> {
			assertThat(translationProvider.openCount()).isEqualTo(1);
			assertThat(translationProvider.latestSession().closed()).isTrue();
			assertThat(handler.activeSessionCount()).isZero();
		});
	}

	@Test
	void providerOpenFailureUsesExistingErrorPathAndCleansReservation() throws Exception {
		translationProvider.failNextOpen();
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);

		socket.sendText(startMessage(UUID.randomUUID()), true).join();

		assertThat(listener.nextText()).isEqualTo("ERROR");
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() -> {
			assertThat(translationProvider.openAttemptCount()).isEqualTo(1);
			assertThat(translationProvider.openCount()).isZero();
			assertThat(handler.activeSessionCount()).isZero();
		});
	}

	@Test
	void rejectsBinaryBeforeStart() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);

		socket.sendBinary(ByteBuffer.allocate(1_600), true).join();

		assertThat(listener.nextText()).isEqualTo("ERROR");
		assertThat(handler.activeSessionCount()).isZero();
		assertThat(translationProvider.openCount()).isZero();
	}

	@Test
	void rejectsUnexpectedPcmFrameSizeAndCleansSession() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");
		socket.sendBinary(ByteBuffer.allocate(1_599), true).join();

		assertThat(listener.nextText()).isEqualTo("ERROR");
		assertThat(handler.activeSessionCount()).isZero();
		assertThat(translationProvider.openCount()).isEqualTo(1);
		assertThat(translationProvider.latestSession().closed()).isTrue();
	}

	private WebSocket connect(TestListener listener) throws Exception {
		return HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(2))
				.build()
				.newWebSocketBuilder()
				.connectTimeout(Duration.ofSeconds(2))
				.buildAsync(URI.create("ws://localhost:" + port + "/ws/audio"), listener)
				.get(2, TimeUnit.SECONDS);
	}

	private String startMessage(UUID sessionId) {
		return """
				{"type":"START","sessionId":"%s","sampleRate":16000,"channels":1,"bitsPerSample":16,"chunkMs":50}
				""".formatted(sessionId);
	}

	private String translationJson(
			UUID sessionId,
			String eventType,
			String sourceText,
			String translatedText,
			long offsetMs,
			long durationMs,
			String observedAt) {
		return "{\"type\":\"TRANSLATION\",\"sessionId\":\"" + sessionId
				+ "\",\"eventType\":\"" + eventType
				+ "\",\"sourceText\":\"" + sourceText
				+ "\",\"translatedText\":\"" + translatedText
				+ "\",\"offsetMs\":" + offsetMs
				+ ",\"durationMs\":" + durationMs
				+ ",\"observedAt\":\"" + observedAt + "\"}";
	}

	private static final class TestListener implements WebSocket.Listener {

		private final LinkedBlockingQueue<String> messages = new LinkedBlockingQueue<>();

		@Override
		public void onOpen(WebSocket webSocket) {
			webSocket.request(1);
		}

		@Override
		public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
			if (last) {
				messages.add(data.toString());
			}
			webSocket.request(1);
			return null;
		}

		@Override
		public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
			return null;
		}

		String nextText() throws InterruptedException {
			return messages.poll(2, TimeUnit.SECONDS);
		}

		List<String> nextTexts(int count) throws InterruptedException {
			CopyOnWriteArrayList<String> received = new CopyOnWriteArrayList<>();
			for (int index = 0; index < count; index++) {
				String message = nextText();
				if (message != null) {
					received.add(message);
				}
			}
			return List.copyOf(received);
		}

		String pollText() {
			return messages.poll();
		}
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class FakeProviderConfiguration {

		@Bean
		FakeTranslationProvider fakeTranslationProvider() {
			return new FakeTranslationProvider();
		}
	}

	static final class FakeTranslationProvider implements TranslationProvider {

		private final CopyOnWriteArrayList<FakeTranslationSession> sessions =
				new CopyOnWriteArrayList<>();
		private final AtomicInteger openAttempts = new AtomicInteger();
		private final AtomicBoolean failNextOpen = new AtomicBoolean();

		@Override
		public TranslationSession open(Consumer<TranslationEvent> listener) {
			openAttempts.incrementAndGet();
			if (failNextOpen.compareAndSet(true, false)) {
				throw new IllegalStateException("simulated provider failure");
			}
			FakeTranslationSession session = new FakeTranslationSession(listener);
			sessions.add(session);
			return session;
		}

		int openCount() {
			return sessions.size();
		}

		int openAttemptCount() {
			return openAttempts.get();
		}

		FakeTranslationSession latestSession() {
			return sessions.getLast();
		}

		void reset() {
			sessions.clear();
			openAttempts.set(0);
			failNextOpen.set(false);
		}

		void failNextOpen() {
			failNextOpen.set(true);
		}
	}

	static final class FakeTranslationSession implements TranslationSession {

		private final Consumer<TranslationEvent> listener;
		private final CopyOnWriteArrayList<byte[]> frames = new CopyOnWriteArrayList<>();
		private final AtomicBoolean closed = new AtomicBoolean();

		FakeTranslationSession(Consumer<TranslationEvent> listener) {
			this.listener = listener;
		}

		@Override
		public void pushAudio(byte[] pcm) {
			frames.add(pcm.clone());
		}

		@Override
		public void close() {
			closed.set(true);
		}

		List<byte[]> frames() {
			return List.copyOf(frames);
		}

		boolean closed() {
			return closed.get();
		}

		void emit(TranslationEvent event) {
			listener.accept(event);
		}
	}
}

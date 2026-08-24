package com.rtta.dorriss.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import com.rtta.dorriss.translation.TranslationProvider;
import com.rtta.dorriss.translation.TranslationSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = {
				"spike.enabled=false",
				"rtta.translation.provider=fake"
		})
@Import(LiveWebSocketIntegrationTests.FakeProviderConfiguration.class)
class LiveWebSocketIntegrationTests {

	@LocalServerPort
	private int port;

	@Autowired
	private LiveSessionHub hub;

	@Autowired
	private FakeTranslationProvider translationProvider;

	@BeforeEach
	void reset() {
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() -> {
			assertThat(hub.subscriberCount()).isZero();
			assertThat(hub.activeSessionId()).isNull();
		});
		translationProvider.reset();
	}

	@Test
	void announcesSessionAndBroadcastsPartialFinalAndStop() throws Exception {
		TestListener liveListener = new TestListener();
		TestListener audioListener = new TestListener();
		WebSocket liveSocket = connect("/ws/live", liveListener);
		WebSocket audioSocket = connect("/ws/audio", audioListener);
		UUID sessionId = UUID.randomUUID();

		assertThat(liveListener.nextText())
				.isEqualTo("{\"type\":\"SESSION_STATE\",\"state\":\"IDLE\",\"sessionId\":null,\"startedAt\":null}");
		audioSocket.sendText(startMessage(sessionId), true).join();
		assertThat(audioListener.nextText()).isEqualTo("STARTED");
		assertThat(liveListener.nextText())
				.contains("\"type\":\"SESSION_STARTED\"")
				.contains("\"sessionId\":\"" + sessionId + "\"");

		translationProvider.latestSession().emit(translation(
				TranslationEventType.PARTIAL,
				"Pulsars are",
				"Pulsar là",
				760));
		assertThat(audioListener.nextText()).contains("\"eventType\":\"PARTIAL\"");
		assertThat(liveListener.nextText())
				.contains("\"type\":\"TRANSLATION\"")
				.contains("\"eventType\":\"PARTIAL\"")
				.contains("\"translatedText\":\"Pulsar là\"");

		translationProvider.latestSession().emit(translation(
				TranslationEventType.FINAL,
				"Pulsars are rapidly rotating neutron stars.",
				"Pulsar là các sao neutron quay nhanh.",
				2_760));
		assertThat(audioListener.nextText()).contains("\"eventType\":\"FINAL\"");
		assertThat(liveListener.nextText())
				.contains("\"eventType\":\"FINAL\"")
				.contains("\"translatedText\":\"Pulsar là các sao neutron quay nhanh.\"");

		audioSocket.sendText(stopMessage(sessionId), true).join();
		assertThat(audioListener.nextText()).isEqualTo("STOPPED");
		assertThat(liveListener.nextText())
				.contains("\"type\":\"SESSION_STOPPED\"")
				.contains("\"sessionId\":\"" + sessionId + "\"");
		assertThat(translationProvider.latestSession().closed()).isTrue();

		liveSocket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
		audioSocket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
	}

	@Test
	void reconnectsToActiveSessionAndSubscriberDisconnectDoesNotOwnAudio() throws Exception {
		TestListener audioListener = new TestListener();
		WebSocket audioSocket = connect("/ws/audio", audioListener);
		UUID sessionId = UUID.randomUUID();
		audioSocket.sendText(startMessage(sessionId), true).join();
		assertThat(audioListener.nextText()).isEqualTo("STARTED");

		TestListener firstListener = new TestListener();
		TestListener secondListener = new TestListener();
		WebSocket first = connect("/ws/live", firstListener);
		WebSocket second = connect("/ws/live", secondListener);
		assertThat(firstListener.nextText())
				.contains("\"type\":\"SESSION_STATE\"")
				.contains("\"state\":\"LIVE\"")
				.contains("\"sessionId\":\"" + sessionId + "\"");
		assertThat(secondListener.nextText()).contains("\"state\":\"LIVE\"");

		first.sendClose(WebSocket.NORMAL_CLOSURE, "tab closed").join();
		await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
				assertThat(hub.subscriberCount()).isEqualTo(1));
		assertThat(translationProvider.latestSession().closed()).isFalse();

		translationProvider.latestSession().emit(translation(
				TranslationEventType.PARTIAL,
				"The Hamiltonian",
				"Hamiltonian",
				1_000));
		assertThat(audioListener.nextText()).contains("\"eventType\":\"PARTIAL\"");
		assertThat(secondListener.nextText())
				.contains("\"eventType\":\"PARTIAL\"")
				.contains("\"sourceText\":\"The Hamiltonian\"");
		assertThat(translationProvider.latestSession().closed()).isFalse();

		second.sendClose(WebSocket.NORMAL_CLOSURE, "tab closed").join();
		assertThat(translationProvider.latestSession().closed()).isFalse();
		audioSocket.sendText(stopMessage(sessionId), true).join();
		assertThat(audioListener.nextText()).isEqualTo("STOPPED");
		assertThat(translationProvider.latestSession().closed()).isTrue();
		audioSocket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
	}

	private WebSocket connect(String path, TestListener listener) throws Exception {
		return HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(2))
				.build()
				.newWebSocketBuilder()
				.connectTimeout(Duration.ofSeconds(2))
				.buildAsync(URI.create("ws://localhost:" + port + path), listener)
				.get(2, TimeUnit.SECONDS);
	}

	private String startMessage(UUID sessionId) {
		return "{\"type\":\"START\",\"sessionId\":\"" + sessionId
				+ "\",\"sampleRate\":16000,\"channels\":1,\"bitsPerSample\":16,\"chunkMs\":50}";
	}

	private String stopMessage(UUID sessionId) {
		return "{\"type\":\"STOP\",\"sessionId\":\"" + sessionId + "\"}";
	}

	private TranslationEvent translation(
			TranslationEventType type,
			String source,
			String translated,
			long durationMs) {
		return new TranslationEvent(
				type,
				source,
				translated,
				1_230,
				durationMs,
				Instant.parse("2026-08-25T00:00:02.760Z"));
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

		String nextText() throws InterruptedException {
			return messages.poll(2, TimeUnit.SECONDS);
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

		@Override
		public TranslationSession open(Consumer<TranslationEvent> listener) {
			FakeTranslationSession session = new FakeTranslationSession(listener);
			sessions.add(session);
			return session;
		}

		FakeTranslationSession latestSession() {
			return sessions.getLast();
		}

		void reset() {
			sessions.clear();
		}
	}

	static final class FakeTranslationSession implements TranslationSession {

		private final Consumer<TranslationEvent> listener;
		private final AtomicBoolean closed = new AtomicBoolean();

		FakeTranslationSession(Consumer<TranslationEvent> listener) {
			this.listener = listener;
		}

		@Override
		public void pushAudio(byte[] pcm) {
		}

		@Override
		public void close() {
			closed.set(true);
		}

		void emit(TranslationEvent event) {
			listener.accept(event);
		}

		boolean closed() {
			return closed.get();
		}
	}
}

package com.rtta.dorriss.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;

import java.net.URI;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.meeting.MeetingStatus;
import com.rtta.dorriss.transcript.TranscriptUtteranceRepository;
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
				"rtta.translation.provider=fake",
				"rtta.security.household-code=test-household-code",
				"server.servlet.session.cookie.secure=false"
		})
@Import(LiveWebSocketIntegrationTests.FakeProviderConfiguration.class)
class LiveWebSocketIntegrationTests extends PostgresIntegrationTestSupport {

	@LocalServerPort
	private int port;

	@Autowired
	private LiveSessionHub hub;

	@Autowired
	private FakeTranslationProvider translationProvider;

	@Autowired
	private MeetingRepository meetingRepository;

	@Autowired
	private TranscriptUtteranceRepository utteranceRepository;

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
				.isEqualTo("{\"type\":\"SESSION_STATE\",\"state\":\"IDLE\",\"sessionId\":null,\"meetingId\":null,\"startedAt\":null}");
		audioSocket.sendText(startMessage(sessionId), true).join();
		assertThat(audioListener.nextText()).isEqualTo("STARTED");
		Meeting meeting = meetingRepository.findByLiveSessionId(sessionId).orElseThrow();
		assertThat(liveListener.nextText())
				.contains("\"type\":\"SESSION_STARTED\"")
				.contains("\"sessionId\":\"" + sessionId + "\"")
				.contains("\"meetingId\":\"" + meeting.getId() + "\"");

		translationProvider.latestSession().emit(translation(
				TranslationEventType.PARTIAL,
				"Pulsars are",
				"Pulsar là",
				760));
		assertThat(audioListener.nextText()).contains("\"eventType\":\"PARTIAL\"");
		assertThat(liveListener.nextText())
				.contains("\"type\":\"TRANSLATION\"")
				.contains("\"eventType\":\"PARTIAL\"")
				.contains("\"utteranceId\":null")
				.contains("\"translatedText\":\"Pulsar là\"");
		assertThat(utteranceRepository.countByMeetingId(meeting.getId())).isZero();

		translationProvider.latestSession().emit(translation(
				TranslationEventType.FINAL,
				"Pulsars are rapidly rotating neutron stars.",
				"Pulsar là các sao neutron quay nhanh.",
				2_760));
		assertThat(audioListener.nextText()).contains("\"eventType\":\"FINAL\"");
		String finalPayload = liveListener.nextText();
		assertThat(finalPayload)
				.contains("\"eventType\":\"FINAL\"")
				.contains("\"translatedText\":\"Pulsar là các sao neutron quay nhanh.\"");
		var persisted = utteranceRepository.findAll().stream()
				.filter(utterance -> utterance.getMeetingId().equals(meeting.getId()))
				.findFirst()
				.orElseThrow();
		assertThat(finalPayload).contains("\"utteranceId\":\"" + persisted.getId() + "\"");

		audioSocket.sendText(stopMessage(sessionId), true).join();
		assertThat(audioListener.nextText()).isEqualTo("STOPPED");
		assertThat(liveListener.nextText())
				.contains("\"type\":\"SESSION_STOPPED\"")
				.contains("\"sessionId\":\"" + sessionId + "\"");
		assertThat(translationProvider.latestSession().closed()).isTrue();
		assertThat(meetingRepository.findById(meeting.getId()).orElseThrow().getStatus())
				.isEqualTo(MeetingStatus.COMPLETED);

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
		if ("/ws/live".equals(path)) return connectAuthenticatedLive(listener);
		WebSocket socket = rawConnect(HttpClient.newHttpClient(), path, listener);
		socket.sendText("{\"type\":\"AUTH\",\"householdCode\":\"test-household-code\"}", true).join();
		assertThat(listener.nextText()).isEqualTo("AUTHENTICATED");
		return socket;
	}

	private WebSocket connectAuthenticatedLive(TestListener listener) throws Exception {
		CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
		HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
		HttpResponse<String> bootstrap = client.send(HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/api/auth/me"))
				.GET().build(), HttpResponse.BodyHandlers.ofString());
		String csrf = bootstrap.body().replaceFirst(".*\\\"csrfToken\\\":\\\"([^\\\"]+)\\\".*", "$1");
		HttpResponse<String> login = client.send(HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/api/auth/login"))
				.header("Content-Type", "application/json")
				.header("X-CSRF-TOKEN", csrf)
				.POST(HttpRequest.BodyPublishers.ofString("{\"code\":\"test-household-code\"}"))
				.build(), HttpResponse.BodyHandlers.ofString());
		assertThat(login.statusCode()).isEqualTo(200);
		return rawConnect(client, "/ws/live", listener);
	}

	private WebSocket rawConnect(HttpClient client, String path, TestListener listener) throws Exception {
		return client
				.newWebSocketBuilder()
				.connectTimeout(Duration.ofSeconds(2))
				.buildAsync(URI.create("ws://localhost:" + port + path), listener)
				.get(2, TimeUnit.SECONDS);
	}

	@Test
	void unauthenticatedLiveSocketIsRejected() {
		assertThatThrownBy(() -> rawConnect(HttpClient.newHttpClient(), "/ws/live", new TestListener()))
				.isInstanceOf(ExecutionException.class);
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

package com.rtta.dorriss.audio;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "spike.enabled=false")
class AudioWebSocketIntegrationTests {

	@LocalServerPort
	private int port;

	@Autowired
	private AudioWebSocketHandler handler;

	@Test
	void streamsBinaryPcmBetweenStartAndStopAndCleansSession() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);
		UUID sessionId = UUID.randomUUID();

		socket.sendText(startMessage(sessionId), true).join();
		assertThat(listener.nextText()).isEqualTo("STARTED");

		socket.sendBinary(ByteBuffer.allocate(1_600), true).join();
		socket.sendText("{\"type\":\"STOP\",\"sessionId\":\"" + sessionId + "\"}", true).join();
		assertThat(listener.nextText()).isEqualTo("STOPPED");
		assertThat(handler.activeSessionCount()).isZero();

		socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
	}

	@Test
	void rejectsBinaryBeforeStart() throws Exception {
		TestListener listener = new TestListener();
		WebSocket socket = connect(listener);

		socket.sendBinary(ByteBuffer.allocate(1_600), true).join();

		assertThat(listener.nextText()).isEqualTo("ERROR");
		assertThat(handler.activeSessionCount()).isZero();
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
	}
}

package com.rtta.dorriss.audio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import com.rtta.dorriss.live.LiveSessionHub;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import com.rtta.dorriss.translation.TranslationProvider;
import com.rtta.dorriss.translation.TranslationSession;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

class AudioWebSocketHandlerTests {

	@Test
	void translationSendFailureClosesProviderAndWebSocketResources() throws Exception {
		CapturingTranslationProvider provider = new CapturingTranslationProvider();
		AudioWebSocketHandler handler = new AudioWebSocketHandler(
				new AudioControlProtocol(new ObjectMapper()),
				provider,
				new TranslationWireProtocol(new ObjectMapper()),
				new LiveSessionHub(new ObjectMapper()));
		WebSocketSession socket = mock(WebSocketSession.class);
		AtomicInteger sendCount = new AtomicInteger();
		UUID sessionId = UUID.randomUUID();

		when(socket.getId()).thenReturn("test-connection");
		when(socket.isOpen()).thenReturn(true);
		doAnswer(invocation -> {
			if (sendCount.incrementAndGet() == 2) {
				throw new IOException("simulated unreachable client");
			}
			return null;
		}).when(socket).sendMessage(any(WebSocketMessage.class));

		handler.afterConnectionEstablished(socket);
		handler.handleTextMessage(socket, new TextMessage(startMessage(sessionId)));
		assertThat(handler.activeSessionCount()).isEqualTo(1);
		assertThat(provider.session.closed()).isFalse();

		provider.emit(new TranslationEvent(
				TranslationEventType.PARTIAL,
				"Pulsars",
				"Pulsar",
				0,
				50,
				Instant.parse("2026-08-25T00:00:00Z")));

		assertThat(sendCount).hasValue(2);
		assertThat(handler.activeSessionCount()).isZero();
		assertThat(provider.session.closed()).isTrue();
		verify(socket).close(CloseStatus.SERVER_ERROR);
	}

	private String startMessage(UUID sessionId) {
		return """
				{"type":"START","sessionId":"%s","sampleRate":16000,"channels":1,"bitsPerSample":16,"chunkMs":50}
				""".formatted(sessionId);
	}

	private static final class CapturingTranslationProvider implements TranslationProvider {

		private final CapturingTranslationSession session = new CapturingTranslationSession();
		private Consumer<TranslationEvent> listener;

		@Override
		public TranslationSession open(Consumer<TranslationEvent> listener) {
			this.listener = listener;
			return session;
		}

		private void emit(TranslationEvent event) {
			listener.accept(event);
		}
	}

	private static final class CapturingTranslationSession implements TranslationSession {

		private final AtomicBoolean closed = new AtomicBoolean();

		@Override
		public void pushAudio(byte[] pcm) {
		}

		@Override
		public void close() {
			closed.set(true);
		}

		private boolean closed() {
			return closed.get();
		}
	}
}

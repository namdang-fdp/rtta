package com.rtta.dorriss.live;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import com.rtta.dorriss.audio.api.TranslationWireEvent;
import com.rtta.dorriss.audio.api.TranslationWireEventType;
import com.rtta.dorriss.live.api.LiveErrorEvent;
import com.rtta.dorriss.live.api.LiveSessionStartedEvent;
import com.rtta.dorriss.live.api.LiveSessionStateEvent;
import com.rtta.dorriss.live.api.LiveSessionStatus;
import com.rtta.dorriss.live.api.LiveSessionStoppedEvent;
import com.rtta.dorriss.translation.TranslationEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import tools.jackson.databind.ObjectMapper;

/**
 * Owns the lightweight server-to-web fan-out for the current local meeting.
 * Audio capture remains the session owner; live web sockets are subscribers only.
 */
@Component
public final class LiveSessionHub {

	private static final Logger LOGGER = LoggerFactory.getLogger(LiveSessionHub.class);
	private static final int OUTBOUND_SEND_TIME_LIMIT_MS = 10_000;
	private static final int OUTBOUND_BUFFER_SIZE_LIMIT_BYTES = 256 * 1_024;

	private final Object lifecycleMonitor = new Object();
	private final ObjectMapper objectMapper;
	private final Map<String, LiveSubscriber> subscribers = new ConcurrentHashMap<>();

	private ActiveSession activeSession;

	public LiveSessionHub(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public void subscribe(WebSocketSession socket) {
		LiveSubscriber subscriber = new LiveSubscriber(socket);
		synchronized (lifecycleMonitor) {
			LiveSubscriber previous = subscribers.put(socket.getId(), subscriber);
			if (previous != null) {
				previous.markFailed();
			}
			sendLocked(subscriber, currentStateEvent());
		}
	}

	public void unsubscribe(WebSocketSession socket) {
		synchronized (lifecycleMonitor) {
			LiveSubscriber subscriber = subscribers.remove(socket.getId());
			if (subscriber != null) {
				subscriber.markFailed();
			}
		}
	}

	public void sessionStarted(UUID sessionId, Instant startedAt) {
		synchronized (lifecycleMonitor) {
			activeSession = new ActiveSession(sessionId, startedAt);
			broadcastLocked(new LiveSessionStartedEvent(
					"SESSION_STARTED",
					sessionId.toString(),
					startedAt));
		}
	}

	public void publishTranslation(UUID sessionId, TranslationEvent event) {
		synchronized (lifecycleMonitor) {
			if (!isCurrentSession(sessionId)) {
				return;
			}
			broadcastLocked(new TranslationWireEvent(
					"TRANSLATION",
					sessionId.toString(),
					TranslationWireEventType.valueOf(event.type().name()),
					event.sourceText(),
					event.translatedText(),
					event.audioOffsetMs(),
					event.audioDurationMs(),
					event.observedAt()));
		}
	}

	public void sessionStopped(UUID sessionId, Instant stoppedAt) {
		synchronized (lifecycleMonitor) {
			if (!isCurrentSession(sessionId)) {
				return;
			}
			activeSession = null;
			broadcastLocked(new LiveSessionStoppedEvent(
					"SESSION_STOPPED",
					sessionId.toString(),
					stoppedAt));
		}
	}

	public void sessionError(UUID sessionId, String userMessage) {
		synchronized (lifecycleMonitor) {
			if (activeSession != null && !activeSession.sessionId().equals(sessionId)) {
				return;
			}
			broadcastLocked(new LiveErrorEvent(
					"ERROR",
					sessionId == null ? null : sessionId.toString(),
					userMessage,
					Instant.now()));
		}
	}

	int subscriberCount() {
		return subscribers.size();
	}

	UUID activeSessionId() {
		synchronized (lifecycleMonitor) {
			return activeSession == null ? null : activeSession.sessionId();
		}
	}

	private LiveSessionStateEvent currentStateEvent() {
		if (activeSession == null) {
			return new LiveSessionStateEvent("SESSION_STATE", LiveSessionStatus.IDLE, null, null);
		}
		return new LiveSessionStateEvent(
				"SESSION_STATE",
				LiveSessionStatus.LIVE,
				activeSession.sessionId().toString(),
				activeSession.startedAt());
	}

	private boolean isCurrentSession(UUID sessionId) {
		return activeSession != null && activeSession.sessionId().equals(sessionId);
	}

	private void broadcastLocked(Object event) {
		String payload;
		try {
			payload = objectMapper.writeValueAsString(event);
		}
		catch (RuntimeException exception) {
			LOGGER.error("RTTA LIVE serializationFailed event={} detail={}",
					event.getClass().getSimpleName(), exception.getMessage());
			return;
		}

		for (LiveSubscriber subscriber : subscribers.values()) {
			sendPayloadLocked(subscriber, payload);
		}
	}

	private void sendLocked(LiveSubscriber subscriber, Object event) {
		String payload;
		try {
			payload = objectMapper.writeValueAsString(event);
		}
		catch (RuntimeException exception) {
			LOGGER.error("RTTA LIVE serializationFailed event={} detail={}",
					event.getClass().getSimpleName(), exception.getMessage());
			removeFailedSubscriberLocked(subscriber, exception);
			return;
		}
		sendPayloadLocked(subscriber, payload);
	}

	private void sendPayloadLocked(LiveSubscriber subscriber, String payload) {
		try {
			subscriber.send(new TextMessage(payload));
		}
		catch (IOException | RuntimeException exception) {
			removeFailedSubscriberLocked(subscriber, exception);
		}
	}

	private void removeFailedSubscriberLocked(LiveSubscriber subscriber, Throwable failure) {
		if (!subscriber.markFailed()) {
			return;
		}
		subscribers.remove(subscriber.id(), subscriber);
		LOGGER.debug("RTTA LIVE subscriberRemoved connection={} detail={}",
				subscriber.id(), failure.getMessage());
		try {
			if (subscriber.isOpen()) {
				subscriber.close(CloseStatus.SERVER_ERROR);
			}
		}
		catch (IOException | RuntimeException closeException) {
			LOGGER.debug("Unable to close failed live subscriber {}", subscriber.id(), closeException);
		}
	}

	private record ActiveSession(UUID sessionId, Instant startedAt) {
	}

	private static final class LiveSubscriber {

		private final WebSocketSession rawSocket;
		private final ConcurrentWebSocketSessionDecorator outboundSocket;
		private final AtomicBoolean failed = new AtomicBoolean();

		private LiveSubscriber(WebSocketSession socket) {
			rawSocket = socket;
			outboundSocket = new ConcurrentWebSocketSessionDecorator(
					socket,
					OUTBOUND_SEND_TIME_LIMIT_MS,
					OUTBOUND_BUFFER_SIZE_LIMIT_BYTES);
		}

		private String id() {
			return rawSocket.getId();
		}

		private boolean isOpen() {
			return rawSocket.isOpen();
		}

		private void send(TextMessage message) throws IOException {
			if (failed.get() || !rawSocket.isOpen()) {
				throw new IllegalStateException("Live subscriber is not open");
			}
			outboundSocket.sendMessage(message);
		}

		private boolean markFailed() {
			return failed.compareAndSet(false, true);
		}

		private void close(CloseStatus status) throws IOException {
			rawSocket.close(status);
		}
	}
}

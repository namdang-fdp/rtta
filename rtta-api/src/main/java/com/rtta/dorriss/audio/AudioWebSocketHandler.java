package com.rtta.dorriss.audio;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import com.rtta.dorriss.live.LiveSessionHub;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationProvider;
import com.rtta.dorriss.translation.TranslationSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

@Component
final class AudioWebSocketHandler extends AbstractWebSocketHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(AudioWebSocketHandler.class);
	private static final long METRICS_LOG_INTERVAL_NANOS = TimeUnit.SECONDS.toNanos(5);
	private static final int OUTBOUND_SEND_TIME_LIMIT_MS = 10_000;
	private static final int OUTBOUND_BUFFER_SIZE_LIMIT_BYTES = 256 * 1_024;

	private final AudioControlProtocol controlProtocol;
	private final TranslationProvider translationProvider;
	private final TranslationWireProtocol translationWireProtocol;
	private final LiveSessionHub liveSessionHub;
	private final Map<String, AudioConnectionSession> activeSessions = new ConcurrentHashMap<>();
	private final Map<String, SerializedOutboundWebSocket> outboundConnections =
			new ConcurrentHashMap<>();

	AudioWebSocketHandler(
			AudioControlProtocol controlProtocol,
			TranslationProvider translationProvider,
			TranslationWireProtocol translationWireProtocol,
			LiveSessionHub liveSessionHub) {
		this.controlProtocol = controlProtocol;
		this.translationProvider = translationProvider;
		this.translationWireProtocol = translationWireProtocol;
		this.liveSessionHub = liveSessionHub;
	}

	int activeSessionCount() {
		return activeSessions.size();
	}

	AudioSessionSnapshot activeSessionSnapshot(UUID sessionId) {
		return activeSessions.values().stream()
				.filter(session -> session.command().sessionId().equals(sessionId))
				.findFirst()
				.map(session -> session.metrics().snapshot(System.nanoTime()))
				.orElse(null);
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession socket) {
		outboundConnections.put(
				socket.getId(),
				new SerializedOutboundWebSocket(socket));
	}

	@Override
	protected void handleTextMessage(WebSocketSession socket, TextMessage message) {
		AudioControlCommand command;
		try {
			command = controlProtocol.parse(message.getPayload());
		}
		catch (AudioProtocolException exception) {
			failConnection(socket, "malformed-control", exception.getMessage());
			return;
		}

		if (command instanceof StartCommand start) {
			handleStart(socket, start);
			return;
		}

		handleStop(socket, (StopCommand) command);
	}

	@Override
	protected void handleBinaryMessage(WebSocketSession socket, BinaryMessage message) {
		AudioConnectionSession session = activeSessions.get(socket.getId());
		if (session == null) {
			failConnection(socket, "binary-before-start", "Binary audio received before START");
			return;
		}

		int frameBytes = message.getPayloadLength();
		long arrivalNanos = System.nanoTime();
		AudioSessionSnapshot snapshot = session.metrics().recordFrame(frameBytes, arrivalNanos);

		if (frameBytes != AudioControlProtocol.EXPECTED_FRAME_BYTES) {
			failConnection(
					socket,
					"unexpected-frame-size",
					"Expected 1600 bytes but received " + frameBytes);
			return;
		}

		if (session.metrics().shouldLog(arrivalNanos, METRICS_LOG_INTERVAL_NANOS)) {
			logMetrics("active", snapshot);
		}

		ByteBuffer payload = message.getPayload().asReadOnlyBuffer();
		byte[] pcm = new byte[payload.remaining()];
		payload.get(pcm);
		try {
			session.pushAudio(pcm);
		}
		catch (RuntimeException exception) {
			liveSessionHub.sessionError(
					session.command().sessionId(),
					"Live translation stopped unexpectedly.");
			failConnection(
					socket,
					"translation-provider-failure",
					"Translation provider stopped accepting audio");
		}
	}

	@Override
	public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
		SerializedOutboundWebSocket outbound = outboundConnections.remove(socket.getId());
		if (outbound != null) {
			outbound.markFailed();
		}
		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
			closeTranslation(session, "unexpected-disconnect");
			logSummary("unexpected-disconnect", session.metrics().snapshot(System.nanoTime()));
		}
	}

	@Override
	public void handleTransportError(WebSocketSession socket, Throwable exception) {
		SerializedOutboundWebSocket outbound = outboundConnections.remove(socket.getId());
		if (outbound != null) {
			outbound.markFailed();
		}
		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
			closeTranslation(session, "transport-error");
			logSummary("transport-error", session.metrics().snapshot(System.nanoTime()));
		}
		LOGGER.warn(
				"RTTA AUDIO transportError connection={} detail={}",
				socket.getId(),
				exception.getMessage());
		try {
			if (socket.isOpen()) {
				socket.close(CloseStatus.SERVER_ERROR);
			}
		}
		catch (IOException | RuntimeException closeException) {
			LOGGER.debug("Unable to close failed WebSocket connection {}", socket.getId(), closeException);
		}
	}

	private void handleStart(WebSocketSession socket, StartCommand command) {
		Instant startedAt = Instant.now();
		AudioConnectionSession newSession = new AudioConnectionSession(
				command,
				new AudioSessionMetrics(command, startedAt, System.nanoTime()),
				startedAt);
		AudioConnectionSession existing = activeSessions.putIfAbsent(socket.getId(), newSession);
		if (existing != null) {
			failConnection(socket, "duplicate-start", "Only one START is allowed per WebSocket");
			return;
		}

		TranslationSession translationSession;
		try {
			translationSession = translationProvider.open(
					event -> handleTranslation(socket, newSession, event));
		}
		catch (RuntimeException exception) {
			liveSessionHub.sessionError(
					command.sessionId(),
					"Meeting translation could not start.");
			failConnection(
					socket,
					"translation-open-failed",
					"Translation provider could not open the session");
			return;
		}
		if (!newSession.attachTranslation(translationSession)) {
			return;
		}
		if (!newSession.announceLive(() -> liveSessionHub.sessionStarted(
				command.sessionId(), startedAt))) {
			return;
		}

		LOGGER.info(
				"RTTA AUDIO started session={} sampleRate={} channels={} bitsPerSample={} chunkMs={} expectedFrameBytes={}",
				command.sessionId(),
				command.sampleRate(),
				command.channels(),
				command.bitsPerSample(),
				command.chunkMs(),
				AudioControlProtocol.EXPECTED_FRAME_BYTES);
		sendText(socket, "STARTED", "STARTED acknowledgement");
	}

	private void handleStop(WebSocketSession socket, StopCommand command) {
		AudioConnectionSession session = activeSessions.get(socket.getId());
		if (session == null) {
			failConnection(socket, "stop-before-start", "STOP received without an active session");
			return;
		}
		if (!session.command().sessionId().equals(command.sessionId())) {
			failConnection(socket, "session-id-mismatch", "STOP sessionId does not match START");
			return;
		}

		if (!session.beginClosing()) {
			return;
		}

		closeTranslation(session, "normal-stop");
		if (activeSessions.remove(socket.getId(), session)) {
			logSummary("normal-stop", session.metrics().snapshot(System.nanoTime()));
			sendText(socket, "STOPPED", "STOPPED acknowledgement");
		}
	}

	private void failConnection(WebSocketSession socket, String reason, String detail) {
		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
			closeTranslation(session, reason);
			logSummary(reason, session.metrics().snapshot(System.nanoTime()));
		}
		LOGGER.warn("RTTA AUDIO protocolError connection={} reason={} detail={}", socket.getId(), reason, detail);
		sendText(socket, "ERROR", "ERROR acknowledgement");
		try {
			socket.close(CloseStatus.POLICY_VIOLATION.withReason(reason));
		}
		catch (IOException | RuntimeException exception) {
			LOGGER.debug("Unable to close rejected WebSocket connection {}", socket.getId(), exception);
		}
	}

	private void closeTranslation(AudioConnectionSession session, String reason) {
		CloseResources resources = session.detachTranslation();
		if (resources == null) {
			return;
		}
		try {
			if (resources.translationSession() != null) {
				resources.translationSession().close();
			}
		}
		catch (RuntimeException exception) {
			LOGGER.warn(
					"RTTA TRANSLATION cleanupFailed session={} reason={}",
					session.command().sessionId(),
					reason);
		}
		finally {
			if (resources.liveAnnounced()) {
				liveSessionHub.sessionStopped(session.command().sessionId(), Instant.now());
			}
		}
	}

	private void handleTranslation(
			WebSocketSession socket,
			AudioConnectionSession session,
			TranslationEvent event) {
		logTranslation(session.command().sessionId(), session.startedAt(), event);
		if (activeSessions.get(socket.getId()) != session) {
			return;
		}
		liveSessionHub.publishTranslation(session.command().sessionId(), event);

		String payload;
		try {
			payload = translationWireProtocol.serialize(session.command().sessionId(), event);
		}
		catch (RuntimeException exception) {
			LOGGER.warn(
					"RTTA TRANSLATION serializationFailed session={} detail={}",
					session.command().sessionId(),
					exception.getMessage());
			handleOutboundFailure(socket, "translation serialization", exception);
			return;
		}

		sendText(socket, payload, event.type() + " translation");
	}

	private boolean sendText(WebSocketSession socket, String payload, String description) {
		SerializedOutboundWebSocket outbound = outboundConnections.get(socket.getId());
		if (outbound == null || !socket.isOpen()) {
			handleOutboundFailure(
					socket,
					description,
					new IllegalStateException("WebSocket connection is not open"));
			return false;
		}

		try {
			outbound.send(new TextMessage(payload));
			return true;
		}
		catch (IOException | RuntimeException exception) {
			handleOutboundFailure(socket, description, exception);
			return false;
		}
	}

	private void handleOutboundFailure(
			WebSocketSession socket,
			String description,
			Throwable exception) {
		SerializedOutboundWebSocket outbound = outboundConnections.get(socket.getId());
		if (outbound != null && !outbound.markFailed()) {
			return;
		}
		if (outbound != null) {
			outboundConnections.remove(socket.getId(), outbound);
		}

		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
			closeTranslation(session, "outbound-send-failed");
			logSummary("outbound-send-failed", session.metrics().snapshot(System.nanoTime()));
		}
		LOGGER.warn(
				"RTTA AUDIO outboundFailed connection={} message={} detail={}",
				socket.getId(),
				description,
				exception.getMessage());
		try {
			if (socket.isOpen()) {
				socket.close(CloseStatus.SERVER_ERROR);
			}
		}
		catch (IOException | RuntimeException closeException) {
			LOGGER.debug("Unable to close failed WebSocket connection {}", socket.getId(), closeException);
		}
	}

	private void logMetrics(String state, AudioSessionSnapshot metrics) {
		LOGGER.info(
				"RTTA AUDIO {} session={} frames={} totalBytes={} avgFrameBytes={} framesPerSec={} bytesPerSec={} avgIntervalMs={} jitterMs={} unexpectedFrames={}",
				state,
				metrics.sessionId(),
				metrics.frameCount(),
				metrics.totalBytes(),
				Math.round(metrics.averageFrameBytes()),
				formatRate(metrics.framesPerSecond()),
				Math.round(metrics.bytesPerSecond()),
				formatMillis(metrics.averageIntervalMs()),
				formatMillis(metrics.intervalVariationMs()),
				metrics.unexpectedFrameSizeCount());
	}

	private void logSummary(String reason, AudioSessionSnapshot metrics) {
		LOGGER.info(
				"RTTA AUDIO summary reason={} session={} startedAt={} lastFrameAt={} durationMs={} frames={} totalBytes={} avgFrameBytes={} framesPerSec={} bytesPerSec={} avgIntervalMs={} jitterMs={} unexpectedFrames={}",
				reason,
				metrics.sessionId(),
				metrics.startedAt(),
				metrics.lastFrameArrivalTime(),
				Math.round(metrics.elapsedMs()),
				metrics.frameCount(),
				metrics.totalBytes(),
				Math.round(metrics.averageFrameBytes()),
				formatRate(metrics.framesPerSecond()),
				Math.round(metrics.bytesPerSecond()),
				formatMillis(metrics.averageIntervalMs()),
				formatMillis(metrics.intervalVariationMs()),
				metrics.unexpectedFrameSizeCount());
	}

	private void logTranslation(UUID sessionId, Instant sessionStartedAt, TranslationEvent event) {
		long observedElapsedMs = Math.max(
				0,
				Duration.between(sessionStartedAt, event.observedAt()).toMillis());
		long recognizedAudioEndMs = event.audioOffsetMs() + event.audioDurationMs();
		long estimatedLagMs = observedElapsedMs - recognizedAudioEndMs;
		LOGGER.info(
				"RTTA TRANSLATION {}\n"
						+ "session={} observedAt={} estimatedLagMs={}\n"
						+ "EN: {}\n"
						+ "VI: {}\n"
						+ "offsetMs={} durationMs={}",
				event.type(),
				sessionId,
				event.observedAt(),
				estimatedLagMs,
				logText(event.sourceText()),
				logText(event.translatedText()),
				event.audioOffsetMs(),
				event.audioDurationMs());
	}

	private String logText(String text) {
		return text.isBlank() ? "(empty)" : text.replaceAll("[\\r\\n]+", " ");
	}

	private String formatMillis(double value) {
		return String.format(java.util.Locale.ROOT, "%.1f", value);
	}

	private String formatRate(double value) {
		return String.format(java.util.Locale.ROOT, "%.1f", value);
	}

	private static final class AudioConnectionSession {

		private final StartCommand command;
		private final AudioSessionMetrics metrics;
		private final Instant startedAt;

		private TranslationSession translationSession;
		private boolean closed;
		private boolean acceptingAudio;

		private AudioConnectionSession(
				StartCommand command,
				AudioSessionMetrics metrics,
				Instant startedAt) {
			this.command = command;
			this.metrics = metrics;
			this.startedAt = startedAt;
		}

		private StartCommand command() {
			return command;
		}

		private AudioSessionMetrics metrics() {
			return metrics;
		}

		private Instant startedAt() {
			return startedAt;
		}

		private synchronized boolean attachTranslation(TranslationSession session) {
			if (closed) {
				session.close();
				return false;
			}
			translationSession = session;
			acceptingAudio = true;
			return true;
		}

		private synchronized boolean beginClosing() {
			if (closed || !acceptingAudio) {
				return false;
			}
			acceptingAudio = false;
			return true;
		}

		private synchronized void pushAudio(byte[] pcm) {
			if (closed || !acceptingAudio || translationSession == null) {
				throw new IllegalStateException("Translation session is not active");
			}
			translationSession.pushAudio(pcm);
		}

		private synchronized boolean announceLive(Runnable announcer) {
			if (closed || !acceptingAudio || translationSession == null) {
				return false;
			}
			liveAnnounced = true;
			announcer.run();
			return true;
		}

		private CloseResources detachTranslation() {
			TranslationSession session;
			boolean shouldAnnounceStop;
			synchronized (this) {
				if (closed) {
					return null;
				}
				closed = true;
				acceptingAudio = false;
				session = translationSession;
				translationSession = null;
				shouldAnnounceStop = liveAnnounced;
				liveAnnounced = false;
			}
			return new CloseResources(session, shouldAnnounceStop);
		}

		private boolean liveAnnounced;
	}

	private record CloseResources(
			TranslationSession translationSession,
			boolean liveAnnounced) {
	}

	private static final class SerializedOutboundWebSocket {

		private final ConcurrentWebSocketSessionDecorator socket;
		private final AtomicBoolean failed = new AtomicBoolean();

		private SerializedOutboundWebSocket(WebSocketSession socket) {
			this.socket = new ConcurrentWebSocketSessionDecorator(
					socket,
					OUTBOUND_SEND_TIME_LIMIT_MS,
					OUTBOUND_BUFFER_SIZE_LIMIT_BYTES);
		}

		private void send(TextMessage message) throws IOException {
			if (failed.get()) {
				throw new IllegalStateException("WebSocket outbound path has failed");
			}
			socket.sendMessage(message);
		}

		private boolean markFailed() {
			return failed.compareAndSet(false, true);
		}
	}
}

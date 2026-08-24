package com.rtta.dorriss.audio;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

@Component
final class AudioWebSocketHandler extends AbstractWebSocketHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(AudioWebSocketHandler.class);
	private static final long METRICS_LOG_INTERVAL_NANOS = TimeUnit.SECONDS.toNanos(5);

	private final AudioControlProtocol controlProtocol;
	private final Map<String, AudioConnectionSession> activeSessions = new ConcurrentHashMap<>();

	AudioWebSocketHandler(AudioControlProtocol controlProtocol) {
		this.controlProtocol = controlProtocol;
	}

	int activeSessionCount() {
		return activeSessions.size();
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
		// S02 intentionally discards the raw PCM payload here.
	}

	@Override
	public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
			logSummary("unexpected-disconnect", session.metrics().snapshot(System.nanoTime()));
		}
	}

	@Override
	public void handleTransportError(WebSocketSession socket, Throwable exception) {
		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
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
		AudioConnectionSession newSession = new AudioConnectionSession(
				command,
				new AudioSessionMetrics(command, Instant.now(), System.nanoTime()));
		AudioConnectionSession existing = activeSessions.putIfAbsent(socket.getId(), newSession);
		if (existing != null) {
			failConnection(socket, "duplicate-start", "Only one START is allowed per WebSocket");
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
		sendText(socket, "STARTED");
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

		if (activeSessions.remove(socket.getId(), session)) {
			logSummary("normal-stop", session.metrics().snapshot(System.nanoTime()));
			sendText(socket, "STOPPED");
		}
	}

	private void failConnection(WebSocketSession socket, String reason, String detail) {
		AudioConnectionSession session = activeSessions.remove(socket.getId());
		if (session != null) {
			logSummary(reason, session.metrics().snapshot(System.nanoTime()));
		}
		LOGGER.warn("RTTA AUDIO protocolError connection={} reason={} detail={}", socket.getId(), reason, detail);
		sendText(socket, "ERROR");
		try {
			socket.close(CloseStatus.POLICY_VIOLATION.withReason(reason));
		}
		catch (IOException | RuntimeException exception) {
			LOGGER.debug("Unable to close rejected WebSocket connection {}", socket.getId(), exception);
		}
	}

	private void sendText(WebSocketSession socket, String payload) {
		if (!socket.isOpen()) {
			return;
		}
		try {
			socket.sendMessage(new TextMessage(payload));
		}
		catch (IOException | RuntimeException exception) {
			LOGGER.warn(
					"RTTA AUDIO acknowledgementFailed connection={} detail={}",
					socket.getId(),
					exception.getMessage());
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

	private String formatMillis(double value) {
		return String.format(java.util.Locale.ROOT, "%.1f", value);
	}

	private String formatRate(double value) {
		return String.format(java.util.Locale.ROOT, "%.1f", value);
	}

	private record AudioConnectionSession(StartCommand command, AudioSessionMetrics metrics) {
	}
}

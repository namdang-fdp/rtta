package com.rtta.dorriss.translation.azure;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import com.microsoft.cognitiveservices.speech.CancellationErrorCode;
import com.microsoft.cognitiveservices.speech.CancellationReason;
import com.microsoft.cognitiveservices.speech.PhraseListGrammar;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat;
import com.microsoft.cognitiveservices.speech.audio.PushAudioInputStream;
import com.microsoft.cognitiveservices.speech.translation.SpeechTranslationConfig;
import com.microsoft.cognitiveservices.speech.translation.TranslationRecognitionCanceledEventArgs;
import com.microsoft.cognitiveservices.speech.translation.TranslationRecognitionResult;
import com.microsoft.cognitiveservices.speech.translation.TranslationRecognizer;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import com.rtta.dorriss.translation.TranslationProviderException;
import com.rtta.dorriss.translation.TranslationSession;
import com.rtta.dorriss.translation.TranslationSessionConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

final class AzureSpeechTranslationSession implements TranslationSession {

	private static final Logger LOGGER = LoggerFactory.getLogger(AzureSpeechTranslationSession.class);
	private static final long START_TIMEOUT_SECONDS = 15;
	private static final long FINAL_RESULT_TIMEOUT_SECONDS = 5;
	private static final long STOP_TIMEOUT_SECONDS = 5;
	private static final long RESOURCE_CLOSE_TIMEOUT_SECONDS = 12;

	private final AzureSpeechTranslationProperties properties;
	private final TranslationSessionConfig config;
	private final Consumer<TranslationEvent> listener;
	private final SpeechTranslationConfig speechConfig;
	private final AudioStreamFormat streamFormat;
	private final PushAudioInputStream pushStream;
	private final AudioConfig audioConfig;
	private final TranslationRecognizer recognizer;
	private final PhraseListGrammar phraseList;
	private final long developmentAudioByteLimit;
	private final Object audioWriteMonitor = new Object();
	private final AtomicReference<State> state = new AtomicReference<>(State.STARTING);
	private final AtomicBoolean shutdownStarted = new AtomicBoolean();
	private final CountDownLatch providerStopped = new CountDownLatch(1);
	private final CountDownLatch resourcesClosed = new CountDownLatch(1);

	private volatile String azureSessionId = "pending";
	private long audioBytesPushed;

	private AzureSpeechTranslationSession(
			AzureSpeechTranslationProperties properties,
			TranslationSessionConfig config,
			Consumer<TranslationEvent> listener,
			SpeechTranslationConfig speechConfig,
			AudioStreamFormat streamFormat,
			PushAudioInputStream pushStream,
			AudioConfig audioConfig,
			TranslationRecognizer recognizer,
			PhraseListGrammar phraseList) {
		this.properties = properties;
		this.config = config;
		this.listener = listener;
		this.speechConfig = speechConfig;
		this.streamFormat = streamFormat;
		this.pushStream = pushStream;
		this.audioConfig = audioConfig;
		this.recognizer = recognizer;
		this.phraseList = phraseList;
		this.developmentAudioByteLimit = calculateDevelopmentAudioByteLimit(config);
	}

	static AzureSpeechTranslationSession open(
			AzureSpeechTranslationProperties properties,
			TranslationSessionConfig config,
			Consumer<TranslationEvent> listener) {
		Objects.requireNonNull(config, "config");
		Objects.requireNonNull(listener, "listener");
		validateAudioFormat(config);

		SpeechTranslationConfig speechConfig = null;
		AudioStreamFormat streamFormat = null;
		PushAudioInputStream pushStream = null;
		AudioConfig audioConfig = null;
		TranslationRecognizer recognizer = null;
		PhraseListGrammar phraseList = null;
		try {
			speechConfig = createSpeechConfig(properties);
			speechConfig.setSpeechRecognitionLanguage(config.sourceLanguage());
			speechConfig.addTargetLanguage(config.targetLanguage());
			streamFormat = AudioStreamFormat.getWaveFormatPCM(
					config.sampleRateHz(),
					(short) config.bitsPerSample(),
					(short) config.channels());
			pushStream = PushAudioInputStream.create(streamFormat);
			audioConfig = AudioConfig.fromStreamInput(pushStream);
			recognizer = new TranslationRecognizer(speechConfig, audioConfig);
			phraseList = configurePhraseList(recognizer, config);
		}
		catch (RuntimeException exception) {
			closeCreatedResources(
					properties.key(), phraseList, recognizer, audioConfig,
					pushStream, streamFormat, speechConfig);
			throw exception;
		}

		AzureSpeechTranslationSession session = new AzureSpeechTranslationSession(
				properties,
				config,
				listener,
				speechConfig,
				streamFormat,
				pushStream,
				audioConfig,
				recognizer,
				phraseList);
		try {
			session.start();
			return session;
		}
		catch (RuntimeException exception) {
			session.shutdownAndWait();
			throw exception;
		}
	}

	@Override
	public void pushAudio(byte[] pcm) {
		Objects.requireNonNull(pcm, "pcm");
		if (pcm.length == 0) {
			return;
		}

		synchronized (audioWriteMonitor) {
			if (state.get() != State.ACTIVE) {
				throw new TranslationProviderException("Azure translation session is not active");
			}
			if (developmentAudioByteLimit > 0
					&& pcm.length > developmentAudioByteLimit - audioBytesPushed) {
				String detail = "Configured development session limit of "
						+ config.developmentSessionLimit().toSeconds() + " seconds was reached";
				markProviderFailed("development-limit", detail);
				throw new TranslationProviderException(detail);
			}
			try {
				pushStream.write(pcm);
				audioBytesPushed += pcm.length;
			}
			catch (RuntimeException exception) {
				String detail = safeMessage(exception);
				markProviderFailed("stream-write", detail);
				throw new TranslationProviderException(
						"Azure audio stream write failed: " + detail,
						exception);
			}
		}
	}

	@Override
	public void close() {
		while (true) {
			State current = state.get();
			if (current == State.CLOSED) {
				return;
			}
			if (current == State.CLOSING || current == State.FAILED) {
				break;
			}
			if (state.compareAndSet(current, State.CLOSING)) {
				break;
			}
		}
		shutdownAndWait();
	}

	private void start() {
		subscribeToEvents();
		try {
			recognizer.startContinuousRecognitionAsync()
					.get(START_TIMEOUT_SECONDS, TimeUnit.SECONDS);
		}
		catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			state.set(State.FAILED);
			throw new TranslationProviderException(
					"Interrupted while starting Azure continuous recognition",
					exception);
		}
		catch (ExecutionException | TimeoutException exception) {
			state.set(State.FAILED);
			throw new TranslationProviderException(
					"Azure continuous recognition did not start: " + safeMessage(rootCause(exception)),
					exception);
		}

		if (!state.compareAndSet(State.STARTING, State.ACTIVE)) {
			throw new TranslationProviderException("Azure stopped while the translation session was starting");
		}
	}

	private void subscribeToEvents() {
		recognizer.recognizing.addEventListener((sender, event) ->
				emit(TranslationEventType.PARTIAL, event.getResult()));
		recognizer.recognized.addEventListener((sender, event) ->
				emit(TranslationEventType.FINAL, event.getResult()));
		recognizer.canceled.addEventListener((sender, event) -> handleCanceled(event));
		recognizer.sessionStarted.addEventListener((sender, event) -> {
			azureSessionId = clean(event.getSessionId());
			LOGGER.info("RTTA AZURE sessionStarted azureSession={}", displaySessionId());
		});
		recognizer.sessionStopped.addEventListener((sender, event) -> {
			azureSessionId = clean(event.getSessionId());
			providerStopped.countDown();
			State current = state.get();
			if (current == State.STARTING || current == State.ACTIVE) {
				markProviderFailed("unexpected-session-stop", "Azure stopped unexpectedly");
				return;
			}
			LOGGER.info("RTTA AZURE sessionStopped azureSession={}", displaySessionId());
		});
	}

	private void emit(TranslationEventType type, TranslationRecognitionResult result) {
		State current = state.get();
		if (current != State.ACTIVE && current != State.CLOSING) {
			return;
		}
		String sourceText = clean(result.getText());
		String translatedText = clean(result.getTranslations().get(config.targetLanguage()));
		if (sourceText.isEmpty() && translatedText.isEmpty()) {
			return;
		}

		TranslationEvent event = new TranslationEvent(
				type,
				sourceText,
				translatedText,
				ticksToMillis(result.getOffset()),
				ticksToMillis(result.getDuration()),
				Instant.now());
		try {
			listener.accept(event);
		}
		catch (RuntimeException exception) {
			LOGGER.warn(
					"RTTA AZURE listenerFailed azureSession={} detail={}",
					displaySessionId(),
					safeMessage(exception));
		}
	}

	private void handleCanceled(TranslationRecognitionCanceledEventArgs event) {
		azureSessionId = clean(event.getSessionId());
		providerStopped.countDown();
		if (event.getReason() == CancellationReason.EndOfStream
				&& event.getErrorCode() == CancellationErrorCode.NoError) {
			if (state.get() == State.CLOSING || state.get() == State.FAILED) {
				LOGGER.info(
						"RTTA AZURE endOfStream azureSession={} errorCode=NoError",
						displaySessionId());
				return;
			}
			markProviderFailed("unexpected-end-of-stream", "Azure input ended unexpectedly");
			return;
		}

		String detail = "reason=" + event.getReason()
				+ " code=" + event.getErrorCode()
				+ " detail=" + safeText(event.getErrorDetails());
		markProviderFailed("canceled", detail);
	}

	private void markProviderFailed(String reason, String detail) {
		while (true) {
			State current = state.get();
			if (current == State.CLOSED || current == State.FAILED) {
				return;
			}
			if (state.compareAndSet(current, State.FAILED)) {
				break;
			}
		}
		LOGGER.warn(
				"RTTA AZURE providerFailure azureSession={} reason={} detail={}",
				displaySessionId(),
				reason,
				safeText(detail));
		Thread.ofVirtual()
				.name("rtta-azure-session-cleanup")
				.start(this::performShutdown);
	}

	private void shutdownAndWait() {
		if (shutdownStarted.compareAndSet(false, true)) {
			performShutdownOwned();
			return;
		}
		awaitResourcesClosed();
	}

	private void performShutdown() {
		if (shutdownStarted.compareAndSet(false, true)) {
			performShutdownOwned();
		}
	}

	private void performShutdownOwned() {
		try {
			synchronized (audioWriteMonitor) {
				closeResource("push audio stream", pushStream::close);
			}
			if (!awaitProviderStopped(FINAL_RESULT_TIMEOUT_SECONDS)) {
				try {
					recognizer.stopContinuousRecognitionAsync()
							.get(STOP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
				}
				catch (InterruptedException exception) {
					Thread.currentThread().interrupt();
					LOGGER.warn("RTTA AZURE stopInterrupted azureSession={}", displaySessionId());
				}
				catch (ExecutionException | TimeoutException | RuntimeException exception) {
					LOGGER.warn(
							"RTTA AZURE stopFailed azureSession={} detail={}",
							displaySessionId(),
							safeMessage(rootCause(exception)));
				}
			}
		}
		finally {
			closeResource("phrase list", phraseList == null ? null : phraseList::close);
			closeResource("recognizer", recognizer::close);
			closeResource("audio config", audioConfig::close);
			closeResource("audio stream format", streamFormat::close);
			closeResource("speech translation config", speechConfig::close);
			state.set(State.CLOSED);
			resourcesClosed.countDown();
		}
	}

	private boolean awaitProviderStopped(long timeoutSeconds) {
		try {
			return providerStopped.await(timeoutSeconds, TimeUnit.SECONDS);
		}
		catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			return false;
		}
	}

	private void awaitResourcesClosed() {
		try {
			resourcesClosed.await(RESOURCE_CLOSE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
		}
		catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
		}
	}

	private void closeResource(String name, Runnable closeAction) {
		if (closeAction == null) {
			return;
		}
		try {
			closeAction.run();
		}
		catch (RuntimeException exception) {
			LOGGER.debug(
					"Unable to close Azure {} for session {}: {}",
					name,
					displaySessionId(),
					safeMessage(exception));
		}
	}

	static SpeechTranslationConfig createSpeechConfig(
			AzureSpeechTranslationProperties properties) {
		return SpeechTranslationConfig.fromSubscription(properties.key(), properties.region());
	}

	static PhraseListGrammar configurePhraseList(
			TranslationRecognizer recognizer,
			TranslationSessionConfig config) {
		if (!config.phraseListEnabled()) {
			return null;
		}
		PhraseListGrammar phraseList = PhraseListGrammar.fromRecognizer(recognizer);
		try {
			config.phraseListTerms().forEach(phraseList::addPhrase);
			phraseList.setWeight(config.phraseListWeight());
			return phraseList;
		}
		catch (RuntimeException exception) {
			closeQuietly("", phraseList::close);
			throw exception;
		}
	}

	private static void validateAudioFormat(TranslationSessionConfig config) {
		if (config.sampleRateHz() != 16_000
				|| config.channels() != 1
				|| config.bitsPerSample() != 16) {
			throw new TranslationProviderException(
					"Azure adapter requires 16 kHz mono signed 16-bit PCM");
		}
	}

	private static long calculateDevelopmentAudioByteLimit(TranslationSessionConfig config) {
		if (config.developmentSessionLimit().isZero()) {
			return 0;
		}
		long bytesPerSecond = (long) config.sampleRateHz()
				* config.channels() * config.bitsPerSample() / 8;
		long limitMillis;
		try {
			limitMillis = Math.max(1, config.developmentSessionLimit().toMillis());
		}
		catch (ArithmeticException exception) {
			return Long.MAX_VALUE;
		}
		if (limitMillis > Long.MAX_VALUE / bytesPerSecond) {
			return Long.MAX_VALUE;
		}
		return Math.max(1, limitMillis * bytesPerSecond / 1_000);
	}

	static long ticksToMillis(BigInteger ticks) {
		if (ticks == null || ticks.signum() <= 0) {
			return 0;
		}
		return ticks.divide(BigInteger.valueOf(10_000L)).longValue();
	}

	private static void closeCreatedResources(
			String secret,
			PhraseListGrammar phraseList,
			TranslationRecognizer recognizer,
			AudioConfig audioConfig,
			PushAudioInputStream pushStream,
			AudioStreamFormat streamFormat,
			SpeechTranslationConfig speechConfig) {
		closeQuietly(secret, phraseList == null ? null : phraseList::close);
		closeQuietly(secret, recognizer == null ? null : recognizer::close);
		closeQuietly(secret, audioConfig == null ? null : audioConfig::close);
		closeQuietly(secret, pushStream == null ? null : pushStream::close);
		closeQuietly(secret, streamFormat == null ? null : streamFormat::close);
		closeQuietly(secret, speechConfig == null ? null : speechConfig::close);
	}

	private static void closeQuietly(String secret, Runnable closeAction) {
		if (closeAction == null) {
			return;
		}
		try {
			closeAction.run();
		}
		catch (RuntimeException exception) {
			String message = exception.getMessage();
			if (message != null && secret != null && !secret.isBlank()) {
				message = message.replace(secret, "[REDACTED]");
			}
			LOGGER.debug("Unable to close partially-created Azure resource: {}", message);
		}
	}

	private String safeMessage(Throwable exception) {
		String message = exception.getMessage();
		return safeText(message == null || message.isBlank()
				? exception.getClass().getSimpleName()
				: message);
	}

	private String safeText(String value) {
		String text = value == null || value.isBlank() ? "(no details)" : value;
		if (!properties.key().isBlank()) {
			text = text.replace(properties.key(), "[REDACTED]");
		}
		text = text.replaceAll("[\\r\\n]+", " ").trim();
		return text.length() <= 500 ? text : text.substring(0, 500) + "...";
	}

	private String displaySessionId() {
		return azureSessionId.isBlank() ? "pending" : azureSessionId;
	}

	private static String clean(String value) {
		return value == null ? "" : value.trim().replaceAll("\\s+", " ");
	}

	private static Throwable rootCause(Throwable throwable) {
		Throwable cause = throwable;
		while (cause.getCause() != null && cause.getCause() != cause) {
			cause = cause.getCause();
		}
		return cause;
	}

	private enum State {
		STARTING,
		ACTIVE,
		CLOSING,
		FAILED,
		CLOSED
	}
}

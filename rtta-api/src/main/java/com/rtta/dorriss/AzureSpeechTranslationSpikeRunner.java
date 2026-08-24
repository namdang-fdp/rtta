package com.rtta.dorriss;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;

import com.microsoft.cognitiveservices.speech.CancellationErrorCode;
import com.microsoft.cognitiveservices.speech.CancellationReason;
import com.microsoft.cognitiveservices.speech.PhraseListGrammar;
import com.microsoft.cognitiveservices.speech.ResultReason;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat;
import com.microsoft.cognitiveservices.speech.audio.PushAudioInputStream;
import com.microsoft.cognitiveservices.speech.translation.SpeechTranslationConfig;
import com.microsoft.cognitiveservices.speech.translation.TranslationRecognitionResult;
import com.microsoft.cognitiveservices.speech.translation.TranslationRecognizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "spike.enabled", havingValue = "true", matchIfMissing = false)
final class AzureSpeechTranslationSpikeRunner implements CommandLineRunner, ExitCodeGenerator {

	private static final String SDK_VERSION = "1.51.0";
	private static final long SESSION_START_TIMEOUT_SECONDS = 15;
	private static final long FINAL_RESULT_TIMEOUT_SECONDS = 15;
	private static final long SESSION_STOP_TIMEOUT_SECONDS = 5;

	private final String speechKey;
	private final String speechEndpoint;
	private final String speechRegion;
	private final String sourceLanguage;
	private final String targetLanguage;
	private final boolean phraseListEnabled;
	private final double phraseListWeight;
	private final List<String> phraseListTerms;
	private final Path audioPath;
	private final int audioSecondsLimit;
	private final int chunkMs;
	private final String sourceTitle;
	private final String excerptStart;
	private final String excerptEnd;

	private volatile int exitCode;

	AzureSpeechTranslationSpikeRunner(
			@Value("${spike.speech.key:}") String speechKey,
			@Value("${spike.speech.endpoint:}") String speechEndpoint,
			@Value("${spike.speech.region:}") String speechRegion,
			@Value("${spike.speech.source-language:}") String sourceLanguage,
			@Value("${spike.speech.target-language:}") String targetLanguage,
			@Value("${spike.speech.phrase-list.enabled:false}") boolean phraseListEnabled,
			@Value("${spike.speech.phrase-list.weight:1.5}") double phraseListWeight,
			@Value("${spike.speech.phrase-list.terms:}") String phraseListTerms,
			@Value("${spike.audio.path:./samples/physics.pcm}") String audioPath,
			@Value("${spike.audio.seconds-limit:20}") int audioSecondsLimit,
			@Value("${spike.audio.chunk-ms:50}") int chunkMs,
			@Value("${spike.sample.title:unknown}") String sourceTitle,
			@Value("${spike.sample.excerpt-start:unknown}") String excerptStart,
			@Value("${spike.sample.excerpt-end:unknown}") String excerptEnd) {
		this.speechKey = speechKey == null ? "" : speechKey.trim();
		this.speechEndpoint = speechEndpoint == null ? "" : speechEndpoint.trim();
		this.speechRegion = speechRegion == null ? "" : speechRegion.trim();
		this.sourceLanguage = sourceLanguage == null ? "" : sourceLanguage.trim();
		this.targetLanguage = targetLanguage == null ? "" : targetLanguage.trim();
		this.phraseListEnabled = phraseListEnabled;
		this.phraseListWeight = phraseListWeight;
		this.phraseListTerms = parsePhraseList(phraseListTerms);
		this.audioPath = Path.of(audioPath).normalize();
		this.audioSecondsLimit = audioSecondsLimit;
		this.chunkMs = chunkMs;
		this.sourceTitle = sourceTitle;
		this.excerptStart = excerptStart;
		this.excerptEnd = excerptEnd;
	}

	@Override
	public void run(String... args) {
		PcmAudio.ValidatedAudio audio;
		try {
			validateNonSecretConfiguration();
			audio = PcmAudio.validate(audioPath, audioSecondsLimit, chunkMs);
		} catch (Exception exception) {
			fail("PRE-FLIGHT VALIDATION FAILED", exception);
			return;
		}

		printHeader(audio);

		if (!Files.isRegularFile(Path.of(".env"))) {
			fail("CONFIGURATION MISSING", "Root-level .env was not found. Azure session was not opened.");
			return;
		}
		if (speechKey.isBlank()) {
			fail("CONFIGURATION MISSING", "SPEECH_KEY is missing or blank. Azure session was not opened.");
			return;
		}

		BenchmarkRecorder recorder = new BenchmarkRecorder(targetLanguage, speechKey);
		try {
			runSingleSession(audio, recorder);
		} catch (Throwable throwable) {
			recorder.recordError(throwable);
			exitCode = 1;
		}
		if (recorder.hasErrors()) {
			exitCode = 1;
		}
		recorder.printSummary(audio, speechRegion);
	}

	private void validateNonSecretConfiguration() {
		if (speechRegion.isBlank()) {
			throw new IllegalArgumentException("SPEECH_REGION is missing or blank");
		}
		if (sourceLanguage.isBlank()) {
			throw new IllegalArgumentException("SPEECH_SOURCE_LANGUAGE is missing or blank");
		}
		if (targetLanguage.isBlank()) {
			throw new IllegalArgumentException("SPEECH_TARGET_LANGUAGE is missing or blank");
		}
		if (!speechEndpoint.isBlank() && !speechEndpoint.startsWith("https://")) {
			throw new IllegalArgumentException("SPEECH_ENDPOINT must use https:// when configured");
		}
		if (phraseListEnabled && (!Double.isFinite(phraseListWeight)
				|| phraseListWeight <= 0.0 || phraseListWeight > 2.0)) {
			throw new IllegalArgumentException("SPIKE_PHRASE_LIST_WEIGHT must be greater than 0 and at most 2");
		}
		if (phraseListEnabled && phraseListTerms.isEmpty()) {
			throw new IllegalArgumentException("Phrase list is enabled but SPIKE_PHRASE_LIST_TERMS is empty");
		}
	}

	private void printHeader(PcmAudio.ValidatedAudio audio) {
		System.out.println("=== AZURE SPEECH TRANSLATION SPIKE ===");
		System.out.println();
		System.out.println("Source: " + sourceTitle);
		System.out.printf(Locale.ROOT, "Excerpt: %s -> %s (%.3f seconds)%n",
				excerptStart, excerptEnd, audio.sizeBytes() / (double) PcmAudio.BYTES_PER_SECOND);
		System.out.println("Azure Speech SDK: " + SDK_VERSION);
		System.out.println("Azure region: " + speechRegion);
		System.out.println("Languages: " + sourceLanguage + " -> " + targetLanguage);
		System.out.println("Audio: 16000 Hz, mono, signed 16-bit little endian PCM");
		System.out.println("Chunk size: " + chunkMs + " ms (" + audio.chunkBytes() + " bytes)");
		System.out.println("Configured audio limit: " + audioSecondsLimit + " seconds");
		System.out.println("Absolute hard limit: " + PcmAudio.HARD_MAX_AUDIO_SECONDS + " seconds");
		System.out.println("Phrase list: " + (phraseListEnabled ? "ENABLED" : "DISABLED"));
		if (phraseListEnabled) {
			System.out.printf(Locale.ROOT, "Phrase list weight: %.1f%n", phraseListWeight);
			System.out.println("Phrase list terms: " + String.join(", ", phraseListTerms));
		}
		System.out.println();
	}

	private void runSingleSession(PcmAudio.ValidatedAudio audio, BenchmarkRecorder recorder) throws Exception {
		AudioStreamFormat streamFormat = AudioStreamFormat.getWaveFormatPCM(
				PcmAudio.SAMPLE_RATE_HZ, (short) PcmAudio.BITS_PER_SAMPLE, (short) PcmAudio.CHANNELS);
		try (SpeechTranslationConfig translationConfig = SpeechTranslationConfig.fromSubscription(
				speechKey, speechRegion)) {
			translationConfig.setSpeechRecognitionLanguage(sourceLanguage);
			translationConfig.addTargetLanguage(targetLanguage);
			try (PushAudioInputStream pushStream = PushAudioInputStream.create(streamFormat);
					AudioConfig audioConfig = AudioConfig.fromStreamInput(pushStream);
					TranslationRecognizer recognizer = new TranslationRecognizer(translationConfig, audioConfig)) {
				try (PhraseListGrammar phraseList = configurePhraseList(recognizer)) {
					CountDownLatch sessionFinished = subscribeToEvents(recognizer, recorder);

					recorder.startClock();
					recognizer.startContinuousRecognitionAsync()
							.get(SESSION_START_TIMEOUT_SECONDS, TimeUnit.SECONDS);

					streamInRealTime(audio, pushStream, recorder, sessionFinished);
					pushStream.close();

					boolean endedNaturally = sessionFinished.await(FINAL_RESULT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
					if (!endedNaturally) {
						recorder.recordError("Timed out waiting for final Azure results; stopping the session once.");
						recognizer.stopContinuousRecognitionAsync()
								.get(SESSION_STOP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
						sessionFinished.await(SESSION_STOP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
						exitCode = 1;
					}
				}
			}
		} finally {
			streamFormat.close();
		}
	}

	private PhraseListGrammar configurePhraseList(TranslationRecognizer recognizer) {
		if (!phraseListEnabled) {
			return null;
		}
		PhraseListGrammar phraseList = PhraseListGrammar.fromRecognizer(recognizer);
		phraseListTerms.forEach(phraseList::addPhrase);
		phraseList.setWeight(phraseListWeight);
		return phraseList;
	}

	static List<String> parsePhraseList(String commaSeparatedTerms) {
		if (commaSeparatedTerms == null || commaSeparatedTerms.isBlank()) {
			return List.of();
		}
		return Arrays.stream(commaSeparatedTerms.split(","))
				.map(String::trim)
				.filter(term -> !term.isEmpty())
				.distinct()
				.toList();
	}

	static long nearestRankPercentile(List<Long> samples, int percentile) {
		if (samples.isEmpty()) {
			throw new IllegalArgumentException("At least one sample is required");
		}
		if (percentile < 1 || percentile > 100) {
			throw new IllegalArgumentException("Percentile must be between 1 and 100");
		}
		List<Long> sorted = samples.stream().sorted().toList();
		int rank = (int) Math.ceil(percentile / 100.0 * sorted.size());
		return sorted.get(rank - 1);
	}

	private CountDownLatch subscribeToEvents(TranslationRecognizer recognizer, BenchmarkRecorder recorder) {
		CountDownLatch sessionFinished = new CountDownLatch(1);
		recognizer.sessionStarted.addEventListener((sender, event) -> recorder.sessionStarted());
		recognizer.recognizing.addEventListener((sender, event) ->
				recorder.recognition("PARTIAL", event.getResult()));
		recognizer.recognized.addEventListener((sender, event) ->
				recorder.recognition("FINAL", event.getResult()));
		recognizer.canceled.addEventListener((sender, event) -> {
			recorder.canceled(event.getReason(), event.getErrorCode(), event.getErrorDetails());
			sessionFinished.countDown();
		});
		recognizer.sessionStopped.addEventListener((sender, event) -> {
			recorder.sessionStopped();
			sessionFinished.countDown();
		});
		return sessionFinished;
	}

	private void streamInRealTime(
			PcmAudio.ValidatedAudio audio,
			PushAudioInputStream pushStream,
			BenchmarkRecorder recorder,
			CountDownLatch sessionFinished) throws IOException, InterruptedException {
		byte[] chunk = new byte[audio.chunkBytes()];
		long totalSent = 0;
		long streamStartNanos = System.nanoTime();

		try (BufferedInputStream input = new BufferedInputStream(Files.newInputStream(audio.path()))) {
			while (totalSent < audio.quotaLimitBytes()) {
				if (sessionFinished.getCount() == 0) {
					break;
				}
				int allowed = (int) Math.min(chunk.length, audio.quotaLimitBytes() - totalSent);
				int read = input.read(chunk, 0, allowed);
				if (read == -1) {
					break;
				}
				if (read % PcmAudio.FRAME_BYTES != 0) {
					throw new IOException("PCM input changed after validation and ended on a partial frame");
				}

				pushStream.write(read == chunk.length ? chunk : Arrays.copyOf(chunk, read));
				totalSent += read;
				recorder.updateAudioSent(totalSent);

				long targetNanos = streamStartNanos
						+ totalSent * 1_000_000_000L / PcmAudio.BYTES_PER_SECOND;
				parkUntil(targetNanos);
			}
		}
	}

	private static void parkUntil(long targetNanos) throws InterruptedException {
		while (true) {
			long remaining = targetNanos - System.nanoTime();
			if (remaining <= 0) {
				return;
			}
			LockSupport.parkNanos(remaining);
			if (Thread.interrupted()) {
				throw new InterruptedException("Interrupted while pacing PCM chunks");
			}
		}
	}

	private void fail(String heading, Exception exception) {
		fail(heading, safeMessage(exception.getClass().getSimpleName() + ": " + exception.getMessage()));
	}

	private void fail(String heading, String message) {
		exitCode = 2;
		System.err.println(heading);
		System.err.println(safeMessage(message));
	}

	private String safeMessage(String message) {
		if (message == null) {
			return "(no details)";
		}
		return speechKey.isBlank() ? message : message.replace(speechKey, "[REDACTED]");
	}

	@Override
	public int getExitCode() {
		return exitCode;
	}

	private static final class BenchmarkRecorder {

		private final String targetLanguage;
		private final String secret;
		private final AtomicLong audioSentBytes = new AtomicLong();
		private final List<Long> partialLagSamplesMs = new ArrayList<>();
		private final List<Long> subtitleLagSamplesMs = new ArrayList<>();
		private final List<String> finalEnglish = new ArrayList<>();
		private final List<String> finalVietnamese = new ArrayList<>();
		private final List<String> errors = new ArrayList<>();

		private volatile long startNanos;
		private int partialCount;
		private int finalCount;
		private Long firstEnglishPartialWallMs;
		private Long firstEnglishPartialLagMs;
		private Long firstVietnamesePartialWallMs;
		private Long firstVietnamesePartialLagMs;
		private Long firstUsefulVietnameseWallMs;
		private Long firstUsefulVietnameseLagMs;
		private String firstUsefulVietnameseText;
		private Long firstFinalWallMs;
		private Long lastFinalWallMs;
		private Long lastFinalLagMs;
		private boolean normalEndOfStreamObserved;

		private BenchmarkRecorder(String targetLanguage, String secret) {
			this.targetLanguage = targetLanguage;
			this.secret = secret;
		}

		private void startClock() {
			startNanos = System.nanoTime();
		}

		private void updateAudioSent(long bytes) {
			audioSentBytes.set(bytes);
		}

		private synchronized void sessionStarted() {
			System.out.println("SESSION STARTED");
			System.out.printf(Locale.ROOT, "[wall=%dms audioSent=%dms]%n%n",
					wallElapsedMs(), audioSentMs());
		}

		private synchronized void sessionStopped() {
			System.out.println("SESSION STOPPED");
			System.out.printf(Locale.ROOT, "[wall=%dms audioSent=%dms]%n%n",
					wallElapsedMs(), audioSentMs());
		}

		private synchronized void recognition(String eventType, TranslationRecognitionResult result) {
			String english = clean(result.getText());
			String vietnamese = clean(result.getTranslations().get(targetLanguage));
			if (english.isEmpty() && vietnamese.isEmpty()) {
				return;
			}

			long wallMs = wallElapsedMs();
			long sentMs = audioSentMs();
			long offsetMs = ticksToMs(result.getOffset());
			long durationMs = ticksToMs(result.getDuration());
			long recognizedAudioEndMs = offsetMs + durationMs;
			long lagMs = wallMs - recognizedAudioEndMs;

			if ("PARTIAL".equals(eventType)) {
				partialCount++;
				partialLagSamplesMs.add(lagMs);
				if (!english.isEmpty() && firstEnglishPartialWallMs == null) {
					firstEnglishPartialWallMs = wallMs;
					firstEnglishPartialLagMs = lagMs;
				}
				if (!vietnamese.isEmpty() && firstVietnamesePartialWallMs == null) {
					firstVietnamesePartialWallMs = wallMs;
					firstVietnamesePartialLagMs = lagMs;
				}
				if (!vietnamese.isEmpty() && wordCount(vietnamese) >= 3
						&& firstUsefulVietnameseLagMs == null) {
					firstUsefulVietnameseWallMs = wallMs;
					firstUsefulVietnameseLagMs = lagMs;
					firstUsefulVietnameseText = vietnamese;
				}
			} else {
				finalCount++;
				if (firstFinalWallMs == null) {
					firstFinalWallMs = wallMs;
				}
				lastFinalWallMs = wallMs;
				lastFinalLagMs = lagMs;
				if (!english.isEmpty() && result.getReason() == ResultReason.TranslatedSpeech) {
					finalEnglish.add(english);
				}
				if (!vietnamese.isEmpty() && result.getReason() == ResultReason.TranslatedSpeech) {
					finalVietnamese.add(vietnamese);
				}
			}

			if (!vietnamese.isEmpty()) {
				subtitleLagSamplesMs.add(lagMs);
			}

			System.out.printf(Locale.ROOT, "[wall=%dms audioSent=%dms]%n", wallMs, sentMs);
			System.out.println(eventType);
			System.out.println("EN: " + display(english));
			System.out.println("VI: " + display(vietnamese));
			System.out.println("Azure offset: " + offsetMs + "ms");
			System.out.println("Azure duration: " + durationMs + "ms");
			System.out.println("Recognized audio end: " + recognizedAudioEndMs + "ms");
			System.out.println("Estimated subtitle lag: " + lagMs + "ms");
			System.out.println();
		}

		private synchronized void canceled(
				CancellationReason reason, CancellationErrorCode errorCode, String details) {
			if (reason == CancellationReason.EndOfStream && errorCode == CancellationErrorCode.NoError) {
				normalEndOfStreamObserved = true;
				System.out.println("CANCELED (normal end of stream; no Azure error)");
				System.out.printf(Locale.ROOT, "[wall=%dms audioSent=%dms]%n%n",
						wallElapsedMs(), audioSentMs());
				return;
			}
			String message = "Azure cancellation: reason=" + reason + ", code=" + errorCode
					+ ", details=" + sanitize(details);
			errors.add(message);
			System.err.println("CANCELED");
			System.err.println(message);
			System.err.printf(Locale.ROOT, "[wall=%dms audioSent=%dms]%n%n",
					wallElapsedMs(), audioSentMs());
		}

		private synchronized void recordError(Throwable throwable) {
			recordError(throwable.getClass().getName() + ": " + throwable.getMessage());
		}

		private synchronized void recordError(String message) {
			String sanitized = sanitize(message);
			errors.add(sanitized);
			System.err.println("ERROR: " + sanitized);
		}

		private synchronized boolean hasErrors() {
			return !errors.isEmpty();
		}

		private synchronized void printSummary(PcmAudio.ValidatedAudio audio, String region) {
			String englishTranscript = String.join(" ", finalEnglish);
			String vietnameseTranslation = String.join(" ", finalVietnamese);

			System.out.println("=== BENCHMARK SUMMARY ===");
			System.out.printf(Locale.ROOT, "Audio duration: %.3f seconds%n",
					audio.sizeBytes() / (double) PcmAudio.BYTES_PER_SECOND);
			System.out.printf(Locale.ROOT, "Audio actually sent: %.3f seconds%n",
					audioSentBytes.get() / (double) PcmAudio.BYTES_PER_SECOND);
			System.out.println("Azure region: " + region);
			System.out.println("First non-empty English partial wall timestamp: "
					+ formatMs(firstEnglishPartialWallMs));
			System.out.println("First non-empty English partial estimated lag: "
					+ formatMs(firstEnglishPartialLagMs));
			System.out.println("First non-empty Vietnamese partial wall timestamp: "
					+ formatMs(firstVietnamesePartialWallMs));
			System.out.println("First non-empty Vietnamese partial estimated lag: "
					+ formatMs(firstVietnamesePartialLagMs));
			System.out.println("First useful Vietnamese partial wall timestamp: "
					+ formatMs(firstUsefulVietnameseWallMs));
			System.out.println("Estimated lag for first useful Vietnamese partial: "
					+ formatMs(firstUsefulVietnameseLagMs) + " (useful heuristic: at least 3 words)");
			System.out.println("First useful Vietnamese partial text: " + display(firstUsefulVietnameseText));
			System.out.println("First final wall timestamp: " + formatMs(firstFinalWallMs));
			System.out.println("Last final wall timestamp: " + formatMs(lastFinalWallMs));
			System.out.println("Final estimated lag: " + formatMs(lastFinalLagMs));
			System.out.println("Number of non-empty partial results: " + partialCount);
			System.out.println("Number of non-empty final results: " + finalCount);
			System.out.println("English final transcript: " + display(englishTranscript));
			System.out.println("Vietnamese final translation: " + display(vietnameseTranslation));

			if (partialLagSamplesMs.isEmpty()) {
				System.out.println("P50 partial estimated lag: not observed");
				System.out.println("P90 partial estimated lag: not observed");
				System.out.println("P95 partial estimated lag: not observed");
				System.out.println("Maximum partial estimated lag: not observed");
				System.out.println("Mean partial estimated lag: not observed");
			} else {
				System.out.println("P50 partial estimated lag: "
						+ nearestRankPercentile(partialLagSamplesMs, 50) + "ms");
				System.out.println("P90 partial estimated lag: "
						+ nearestRankPercentile(partialLagSamplesMs, 90) + "ms");
				System.out.println("P95 partial estimated lag: "
						+ nearestRankPercentile(partialLagSamplesMs, 95) + "ms");
				long maximumPartial = partialLagSamplesMs.stream().mapToLong(Long::longValue).max().orElseThrow();
				double meanPartial = partialLagSamplesMs.stream().mapToLong(Long::longValue).average().orElseThrow();
				System.out.println("Maximum partial estimated lag: " + maximumPartial + "ms");
				System.out.printf(Locale.ROOT,
						"Mean partial estimated lag: %.1fms (secondary; partial events are correlated)%n",
						meanPartial);
			}

			if (subtitleLagSamplesMs.isEmpty()) {
				System.out.println("Maximum observed estimated subtitle lag: not observed");
				System.out.println("Average estimated subtitle lag: not observed");
			} else {
				long maximum = subtitleLagSamplesMs.stream().mapToLong(Long::longValue).max().orElseThrow();
				System.out.println("Maximum observed estimated subtitle lag: " + maximum + "ms");
				if (subtitleLagSamplesMs.size() > 1) {
					double average = subtitleLagSamplesMs.stream().mapToLong(Long::longValue).average().orElseThrow();
					System.out.printf(Locale.ROOT,
							"Average estimated subtitle lag: %.1fms across %d non-empty Vietnamese events%n",
							average, subtitleLagSamplesMs.size());
				} else {
					System.out.println("Average estimated subtitle lag: not meaningful (one event)");
				}
			}

			System.out.println("Terminology observations (English ASR presence only):");
			printTermPresence(englishTranscript, "eigenstate");
			printTermPresence(englishTranscript, "eigenvalue");
			printTermPresence(englishTranscript, "eigenfunction");
			String cancellationSummary = errors.isEmpty() ? "none" : String.join(" | ", errors);
			if (normalEndOfStreamObserved) {
				cancellationSummary += " (normal EndOfStream / NoError observed)";
			}
			System.out.println("Cancellation/errors: " + cancellationSummary);
		}

		private static void printTermPresence(String transcript, String term) {
			boolean present = transcript.toLowerCase(Locale.ROOT).contains(term);
			System.out.printf(Locale.ROOT, "%-26s %s%n", term, present ? "PRESENT" : "MISSING");
		}

		private long wallElapsedMs() {
			long started = startNanos;
			return started == 0 ? 0 : TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
		}

		private long audioSentMs() {
			return audioSentBytes.get() * 1_000L / PcmAudio.BYTES_PER_SECOND;
		}

		private String sanitize(String text) {
			if (text == null || text.isBlank()) {
				return "(no details)";
			}
			return secret.isBlank() ? text : text.replace(secret, "[REDACTED]");
		}

		private static long ticksToMs(BigInteger ticks) {
			return ticks.divide(BigInteger.valueOf(10_000L)).longValue();
		}

		private static int wordCount(String text) {
			return text.isBlank() ? 0 : text.trim().split("\\s+").length;
		}

		private static String clean(String text) {
			return text == null ? "" : text.trim().replaceAll("\\s+", " ");
		}

		private static String display(String text) {
			return text == null || text.isBlank() ? "(empty)" : text;
		}

		private static String formatMs(Long value) {
			return value == null ? "not observed" : value + "ms";
		}
	}
}

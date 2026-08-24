package com.rtta.dorriss.meeting;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.rtta.dorriss.transcript.TranscriptPersistenceService;
import com.rtta.dorriss.transcript.TranscriptUtterance;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationSessionConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Keeps database failures isolated from the latency-critical translation transport. */
@Service
public class RealtimeMeetingCoordinator {

	private static final Logger LOGGER = LoggerFactory.getLogger(RealtimeMeetingCoordinator.class);

	private final MeetingLifecycleService lifecycleService;
	private final TranscriptPersistenceService transcriptPersistenceService;
	private final TranslationSessionConfig translationConfig;
	private final String providerName;

	public RealtimeMeetingCoordinator(
			MeetingLifecycleService lifecycleService,
			TranscriptPersistenceService transcriptPersistenceService,
			TranslationSessionConfig translationConfig,
			@Value("${rtta.translation.provider:azure}") String providerName) {
		this.lifecycleService = lifecycleService;
		this.transcriptPersistenceService = transcriptPersistenceService;
		this.translationConfig = translationConfig;
		this.providerName = providerName;
	}

	public UUID start(UUID liveSessionId, Instant startedAt) {
		try {
			return lifecycleService.startMeeting(
					liveSessionId,
					"Research meeting",
					translationConfig.sourceLanguage(),
					translationConfig.targetLanguage(),
					startedAt,
					Map.of("audioTransport", "chrome-extension"))
					.getId();
		}
		catch (RuntimeException exception) {
			LOGGER.error("RTTA MEETING startFailed session={} detail={}",
					liveSessionId, safeDetail(exception));
			return null;
		}
	}

	public Optional<TranscriptUtterance> persistTranslation(
			UUID liveSessionId,
			TranslationEvent event) {
		try {
			return transcriptPersistenceService.persistFinal(
					liveSessionId,
					event,
					Map.of("provider", providerName));
		}
		catch (RuntimeException exception) {
			LOGGER.error("RTTA TRANSCRIPT persistenceFailed session={} offsetMs={} detail={}",
					liveSessionId, event.audioOffsetMs(), safeDetail(exception));
			return Optional.empty();
		}
	}

	public void stop(UUID liveSessionId, Instant stoppedAt, boolean completedNormally) {
		try {
			if (completedNormally) {
				lifecycleService.completeMeeting(liveSessionId, stoppedAt);
			}
			else {
				lifecycleService.failMeeting(liveSessionId, stoppedAt);
			}
		}
		catch (MeetingNotFoundException exception) {
			LOGGER.debug("RTTA MEETING stopIgnored session={} detail={}", liveSessionId, exception.getMessage());
		}
		catch (RuntimeException exception) {
			LOGGER.error("RTTA MEETING stopFailed session={} detail={}",
					liveSessionId, safeDetail(exception));
		}
	}

	private String safeDetail(RuntimeException exception) {
		String message = exception.getMessage();
		return message == null || message.isBlank()
				? exception.getClass().getSimpleName()
				: message.replaceAll("[\\r\\n]+", " ");
	}
}

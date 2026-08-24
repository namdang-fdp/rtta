package com.rtta.dorriss.transcript;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import com.rtta.dorriss.translation.TranslationEvent;
import com.rtta.dorriss.translation.TranslationEventType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TranscriptPersistenceService {

	private final MeetingRepository meetingRepository;
	private final TranscriptUtteranceRepository utteranceRepository;
	private final Clock clock;

	@Autowired
	public TranscriptPersistenceService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository) {
		this(meetingRepository, utteranceRepository, Clock.systemUTC());
	}

	TranscriptPersistenceService(
			MeetingRepository meetingRepository,
			TranscriptUtteranceRepository utteranceRepository,
			Clock clock) {
		this.meetingRepository = meetingRepository;
		this.utteranceRepository = utteranceRepository;
		this.clock = clock;
	}

	@Transactional
	public Optional<TranscriptUtterance> persistFinal(
			UUID liveSessionId,
			TranslationEvent event,
			Map<String, Object> providerMetadata) {
		Objects.requireNonNull(liveSessionId, "liveSessionId");
		Objects.requireNonNull(event, "event");
		if (event.type() != TranslationEventType.FINAL) {
			return Optional.empty();
		}

		Meeting meeting = meetingRepository.findByLiveSessionIdForUpdate(liveSessionId)
				.orElseThrow(() -> new MeetingNotFoundException(liveSessionId));
		String eventKey = eventKey(liveSessionId, event);
		Optional<TranscriptUtterance> existing = utteranceRepository
				.findByMeetingIdAndEventKey(meeting.getId(), eventKey);
		if (existing.isPresent()) {
			return existing;
		}

		long ordinal = utteranceRepository.findMaximumOrdinal(meeting.getId()) + 1;
		TranscriptUtterance utterance = new TranscriptUtterance(
				meeting.getId(),
				ordinal,
				eventKey,
				event.sourceText(),
				event.translatedText(),
				event.audioOffsetMs(),
				event.audioDurationMs(),
				event.observedAt(),
				clock.instant(),
				providerMetadata);
		return Optional.of(utteranceRepository.save(utterance));
	}

	static String eventKey(UUID liveSessionId, TranslationEvent event) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			update(digest, liveSessionId.toString());
			digest.update(ByteBuffer.allocate(Long.BYTES * 2)
					.putLong(event.audioOffsetMs())
					.putLong(event.audioDurationMs())
					.array());
			update(digest, event.sourceText());
			update(digest, event.translatedText());
			return HexFormat.of().formatHex(digest.digest());
		}
		catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is unavailable", exception);
		}
	}

	private static void update(MessageDigest digest, String value) {
		byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
		digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
		digest.update(bytes);
	}
}

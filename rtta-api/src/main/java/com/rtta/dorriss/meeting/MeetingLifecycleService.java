package com.rtta.dorriss.meeting;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetingLifecycleService {

	private final MeetingRepository meetingRepository;
	private final Clock clock;

	@Autowired
	public MeetingLifecycleService(MeetingRepository meetingRepository) {
		this(meetingRepository, Clock.systemUTC());
	}

	MeetingLifecycleService(MeetingRepository meetingRepository, Clock clock) {
		this.meetingRepository = meetingRepository;
		this.clock = clock;
	}

	@Transactional
	public synchronized Meeting startMeeting(
			UUID liveSessionId,
			String title,
			String sourceLanguage,
			String targetLanguage,
			Instant startedAt,
			Map<String, Object> metadata) {
		Objects.requireNonNull(liveSessionId, "liveSessionId");
		Objects.requireNonNull(startedAt, "startedAt");
		return meetingRepository.findByLiveSessionId(liveSessionId)
				.orElseGet(() -> meetingRepository.save(Meeting.start(
						liveSessionId,
						title,
						sourceLanguage,
						targetLanguage,
						startedAt,
						clock.instant(),
						metadata)));
	}

	@Transactional
	public Meeting completeMeeting(UUID liveSessionId, Instant endedAt) {
		Meeting meeting = findLocked(liveSessionId);
		meeting.complete(endedAt, clock.instant());
		return meeting;
	}

	@Transactional
	public Meeting failMeeting(UUID liveSessionId, Instant endedAt) {
		Meeting meeting = findLocked(liveSessionId);
		meeting.fail(endedAt, clock.instant());
		return meeting;
	}

	@Transactional(readOnly = true)
	public Meeting requireMeeting(UUID meetingId) {
		return meetingRepository.findById(meetingId)
				.orElseThrow(() -> new MeetingNotFoundException(meetingId));
	}

	@Transactional(readOnly = true)
	public Meeting requireByLiveSessionId(UUID liveSessionId) {
		return meetingRepository.findByLiveSessionId(liveSessionId)
				.orElseThrow(() -> new MeetingNotFoundException(liveSessionId));
	}

	private Meeting findLocked(UUID liveSessionId) {
		return meetingRepository.findByLiveSessionIdForUpdate(liveSessionId)
				.orElseThrow(() -> new MeetingNotFoundException(liveSessionId));
	}
}

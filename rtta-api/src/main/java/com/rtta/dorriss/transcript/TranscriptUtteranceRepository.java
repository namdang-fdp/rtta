package com.rtta.dorriss.transcript;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TranscriptUtteranceRepository extends JpaRepository<TranscriptUtterance, UUID> {

	Optional<TranscriptUtterance> findByMeetingIdAndEventKey(UUID meetingId, String eventKey);

	@Query("select coalesce(max(utterance.ordinal), 0) from TranscriptUtterance utterance where utterance.meetingId = :meetingId")
	long findMaximumOrdinal(@Param("meetingId") UUID meetingId);
}

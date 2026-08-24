package com.rtta.dorriss.transcript;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TranscriptUtteranceRepository extends JpaRepository<TranscriptUtterance, UUID> {

	Optional<TranscriptUtterance> findByMeetingIdAndEventKey(UUID meetingId, String eventKey);

	@Query("select coalesce(max(utterance.ordinal), 0) from TranscriptUtterance utterance where utterance.meetingId = :meetingId")
	long findMaximumOrdinal(@Param("meetingId") UUID meetingId);

	@Query("""
			select utterance from TranscriptUtterance utterance
			where utterance.meetingId = :meetingId
			  and (lower(utterance.sourceText) like lower(concat('%', :query, '%'))
			       or lower(utterance.translatedText) like lower(concat('%', :query, '%')))
			""")
	Page<TranscriptUtterance> searchText(
			@Param("meetingId") UUID meetingId,
			@Param("query") String query,
			Pageable pageable);

	Page<TranscriptUtterance> findAllByMeetingId(UUID meetingId, Pageable pageable);

	Optional<TranscriptUtterance> findByIdAndMeetingId(UUID id, UUID meetingId);

	long countByMeetingId(UUID meetingId);
}

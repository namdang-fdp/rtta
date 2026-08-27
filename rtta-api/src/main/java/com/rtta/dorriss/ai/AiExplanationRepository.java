package com.rtta.dorriss.ai;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AiExplanationRepository extends JpaRepository<AiExplanation, UUID> {

	List<AiExplanation> findAllByMeetingIdOrderByCreatedAtDescIdDesc(UUID meetingId);

	List<AiExplanation> findAllByMeetingIdAndUtteranceIdOrderByCreatedAtAscIdAsc(
			UUID meetingId,
			UUID utteranceId);
}

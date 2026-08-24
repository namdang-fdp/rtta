package com.rtta.dorriss.summary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingSummaryRepository extends JpaRepository<MeetingSummary, UUID> {

	List<MeetingSummary> findAllByMeetingIdOrderByCreatedAtDescIdDesc(UUID meetingId);

	Optional<MeetingSummary> findFirstByMeetingIdOrderByCreatedAtDescIdDesc(UUID meetingId);
}

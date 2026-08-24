package com.rtta.dorriss.recording;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordingRepository extends JpaRepository<Recording, UUID> {

	List<Recording> findAllByMeetingIdOrderByStartedAtDescIdDesc(UUID meetingId);

	Optional<Recording> findByIdAndMeetingId(UUID id, UUID meetingId);
}

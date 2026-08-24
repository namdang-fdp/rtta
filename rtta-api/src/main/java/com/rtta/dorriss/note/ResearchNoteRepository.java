package com.rtta.dorriss.note;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResearchNoteRepository extends JpaRepository<ResearchNote, UUID> {

	List<ResearchNote> findAllByMeetingIdOrderByCreatedAtAscIdAsc(UUID meetingId);

	Optional<ResearchNote> findByIdAndMeetingId(UUID id, UUID meetingId);
}

package com.rtta.dorriss.bookmark;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

	List<Bookmark> findAllByMeetingIdOrderByOffsetMsAscCreatedAtAscIdAsc(UUID meetingId);

	Optional<Bookmark> findByIdAndMeetingId(UUID id, UUID meetingId);

	Optional<Bookmark> findByMeetingIdAndUtteranceId(UUID meetingId, UUID utteranceId);
}

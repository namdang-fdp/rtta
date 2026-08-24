package com.rtta.dorriss.meeting;

import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

	Optional<Meeting> findByLiveSessionId(UUID liveSessionId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select meeting from Meeting meeting where meeting.liveSessionId = :liveSessionId")
	Optional<Meeting> findByLiveSessionIdForUpdate(@Param("liveSessionId") UUID liveSessionId);
}

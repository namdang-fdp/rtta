package com.rtta.dorriss.document;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResearchDocumentRepository extends JpaRepository<ResearchDocument, UUID> {

	List<ResearchDocument> findAllByMeetingIdOrderByCreatedAtDescIdDesc(UUID meetingId);

	Optional<ResearchDocument> findByIdAndMeetingId(UUID id, UUID meetingId);

	Optional<ResearchDocument> findFirstByMeetingIdAndSha256(UUID meetingId, String sha256);
}

package com.rtta.dorriss.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.meeting.Meeting;
import com.rtta.dorriss.meeting.MeetingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spike.enabled=false")
@Transactional
class DocumentVectorIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired MeetingRepository meetingRepository;
	@Autowired ResearchDocumentRepository documentRepository;
	@Autowired DocumentChunkJdbcRepository chunkRepository;

	@Test
	void performsExactCosineRetrievalWithinTheMeetingScope() {
		Instant now = Instant.parse("2026-08-25T00:00:00Z");
		Meeting meeting = meetingRepository.saveAndFlush(Meeting.start(
				UUID.randomUUID(), "Vector seminar", "en-US", "vi-VN", now, now, Map.of()));
		ResearchDocument document = new ResearchDocument(
				meeting.getId(), "paper.pdf", "application/pdf", 100, "a".repeat(64),
				meeting.getId() + "/paper.pdf", now);
		document.markProcessing();
		document.markReady(now);
		documentRepository.saveAndFlush(document);
		chunkRepository.insert(document.getId(), new PreparedDocumentChunk(
				0, "Hamiltonian evolution", Map.of("pageNumber", 2)), List.of(1F, 0F, 0F));
		chunkRepository.insert(document.getId(), new PreparedDocumentChunk(
				1, "Unrelated thermal note", Map.of("pageNumber", 8)), List.of(0F, 1F, 0F));

		var results = chunkRepository.findSimilar(meeting.getId(), List.of(0.9F, 0.1F, 0F), 2);

		assertThat(results).hasSize(2);
		assertThat(results.getFirst().content()).isEqualTo("Hamiltonian evolution");
		assertThat(results.getFirst().metadata()).containsEntry("pageNumber", 2);
		assertThat(results.getFirst().similarity()).isGreaterThan(results.getLast().similarity());
	}
}

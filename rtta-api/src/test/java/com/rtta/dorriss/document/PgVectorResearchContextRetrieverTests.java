package com.rtta.dorriss.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.ai.ResearchAiProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PgVectorResearchContextRetrieverTests {

	@Mock ResearchAiProvider aiProvider;
	@Mock DocumentChunkJdbcRepository chunkRepository;
	@Mock ResearchDocumentRepository documentRepository;

	@Test
	void skipsPaidEmbeddingWhenNoReadyDocumentsExist() {
		UUID meetingId = UUID.randomUUID();
		when(documentRepository.existsByMeetingIdAndStatus(meetingId, DocumentStatus.READY)).thenReturn(false);

		var results = retriever().retrieve(meetingId, "Hamiltonian", 5);

		assertThat(results).isEmpty();
		verify(aiProvider, never()).embed("Hamiltonian");
	}

	@Test
	void mapsRetrievedMetadataIntoCitationReadyContext() {
		UUID meetingId = UUID.randomUUID();
		UUID documentId = UUID.randomUUID();
		when(documentRepository.existsByMeetingIdAndStatus(meetingId, DocumentStatus.READY)).thenReturn(true);
		when(aiProvider.embed("Hamiltonian")).thenReturn(List.of(1F, 0F));
		when(chunkRepository.findSimilar(meetingId, List.of(1F, 0F), 5)).thenReturn(List.of(
				new StoredDocumentChunk(documentId, "paper.pdf", "Hamiltonian evidence",
						Map.of("pageNumber", 4), 0.92)));

		var result = retriever().retrieve(meetingId, "Hamiltonian", 5).getFirst();

		assertThat(result.documentId()).isEqualTo(documentId);
		assertThat(result.metadata()).containsEntry("pageNumber", 4);
		assertThat(result.similarity()).isEqualTo(0.92);
	}

	private PgVectorResearchContextRetriever retriever() {
		return new PgVectorResearchContextRetriever(aiProvider, chunkRepository, documentRepository);
	}
}

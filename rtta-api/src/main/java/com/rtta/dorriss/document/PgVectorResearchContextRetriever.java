package com.rtta.dorriss.document;

import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.ai.ResearchAiProvider;
import com.rtta.dorriss.ai.ResearchContextChunk;
import com.rtta.dorriss.ai.ResearchContextRetriever;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PgVectorResearchContextRetriever implements ResearchContextRetriever {

	private static final Logger LOGGER = LoggerFactory.getLogger(PgVectorResearchContextRetriever.class);
	private final ResearchAiProvider aiProvider;
	private final DocumentChunkJdbcRepository chunkRepository;
	private final ResearchDocumentRepository documentRepository;

	public PgVectorResearchContextRetriever(
			ResearchAiProvider aiProvider,
			DocumentChunkJdbcRepository chunkRepository,
			ResearchDocumentRepository documentRepository) {
		this.aiProvider = aiProvider;
		this.chunkRepository = chunkRepository;
		this.documentRepository = documentRepository;
	}

	@Override
	public List<ResearchContextChunk> retrieve(UUID meetingId, String query, int limit) {
		if (query == null || query.isBlank()) return List.of();
		try {
			if (!documentRepository.existsByMeetingIdAndStatus(meetingId, DocumentStatus.READY)) {
				return List.of();
			}
			return chunkRepository.findSimilar(meetingId, aiProvider.embed(query), limit)
					.stream()
					.map(chunk -> new ResearchContextChunk(
							chunk.documentId(), chunk.fileName(), chunk.content(),
							chunk.metadata(), chunk.similarity()))
					.toList();
		}
		catch (RuntimeException exception) {
			LOGGER.warn("RTTA RAG retrievalSkipped meeting={} cause={}",
					meetingId, exception.getClass().getSimpleName());
			return List.of();
		}
	}
}

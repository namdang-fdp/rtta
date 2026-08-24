package com.rtta.dorriss.document;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Repository
public class DocumentChunkJdbcRepository {

	private final NamedParameterJdbcTemplate jdbc;
	private final ObjectMapper objectMapper;

	public DocumentChunkJdbcRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
	}

	public void insert(UUID documentId, PreparedDocumentChunk chunk, List<Float> embedding) {
		jdbc.update("""
				INSERT INTO document_chunks (id, document_id, chunk_index, content, metadata, embedding)
				VALUES (:id, :documentId, :chunkIndex, :content, CAST(:metadata AS jsonb), CAST(:embedding AS vector))
				""", new MapSqlParameterSource()
				.addValue("id", UUID.randomUUID())
				.addValue("documentId", documentId)
				.addValue("chunkIndex", chunk.index())
				.addValue("content", chunk.content())
				.addValue("metadata", objectMapper.writeValueAsString(chunk.metadata()))
				.addValue("embedding", vectorLiteral(embedding)));
	}

	public void deleteAllByDocumentId(UUID documentId) {
		jdbc.update("DELETE FROM document_chunks WHERE document_id = :documentId", Map.of("documentId", documentId));
	}

	public List<StoredDocumentChunk> findSimilar(
			UUID meetingId,
			List<Float> queryEmbedding,
			int limit) {
		return jdbc.query("""
				SELECT d.id AS document_id, d.file_name, dc.content, dc.metadata,
				       1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity
				FROM document_chunks dc
				JOIN documents d ON d.id = dc.document_id
				WHERE d.meeting_id = :meetingId
				  AND d.status = 'READY'
				  AND dc.embedding IS NOT NULL
				  AND vector_dims(dc.embedding) = :dimensions
				ORDER BY dc.embedding <=> CAST(:embedding AS vector), dc.id
				LIMIT :limit
				""", new MapSqlParameterSource()
				.addValue("meetingId", meetingId)
				.addValue("embedding", vectorLiteral(queryEmbedding))
				.addValue("dimensions", queryEmbedding.size())
				.addValue("limit", Math.max(1, Math.min(limit, 20))),
				(rs, rowNum) -> map(rs));
	}

	private StoredDocumentChunk map(ResultSet result) throws SQLException {
		try {
			Map<String, Object> metadata = objectMapper.readValue(
					result.getString("metadata"), new TypeReference<>() {});
			return new StoredDocumentChunk(
					result.getObject("document_id", UUID.class),
					result.getString("file_name"),
					result.getString("content"),
					Map.copyOf(metadata),
					result.getDouble("similarity"));
		}
		catch (RuntimeException exception) {
			throw new SQLException("Document chunk metadata could not be read", exception);
		}
	}

	private String vectorLiteral(List<Float> values) {
		if (values == null || values.isEmpty()) throw new IllegalArgumentException("Embedding must not be empty");
		return values.stream()
				.peek(value -> {
					if (value == null || !Float.isFinite(value)) throw new IllegalArgumentException("Embedding contains an invalid value");
				})
				.map(value -> Float.toString(value))
				.collect(Collectors.joining(",", "[", "]"));
	}
}

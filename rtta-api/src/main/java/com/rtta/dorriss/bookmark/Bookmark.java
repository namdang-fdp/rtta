package com.rtta.dorriss.bookmark;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "bookmarks")
public class Bookmark {

	@Id
	private UUID id;

	@Column(name = "meeting_id", nullable = false, updatable = false)
	private UUID meetingId;

	@Column(name = "utterance_id", updatable = false)
	private UUID utteranceId;

	@Column(name = "offset_ms", updatable = false)
	private Long offsetMs;

	@Column(columnDefinition = "text")
	private String label;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private Map<String, Object> metadata;

	protected Bookmark() {
	}

	public Bookmark(
			UUID meetingId,
			UUID utteranceId,
			Long offsetMs,
			String label,
			Instant createdAt,
			Map<String, Object> metadata) {
		if (utteranceId == null && offsetMs == null) {
			throw new IllegalArgumentException("A bookmark needs an utterance or offset");
		}
		if (offsetMs != null && offsetMs < 0) {
			throw new IllegalArgumentException("offsetMs must not be negative");
		}
		this.id = UUID.randomUUID();
		this.meetingId = Objects.requireNonNull(meetingId, "meetingId");
		this.utteranceId = utteranceId;
		this.offsetMs = offsetMs;
		this.label = cleanOptional(label);
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
		this.metadata = metadata == null ? null : new LinkedHashMap<>(metadata);
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public UUID getUtteranceId() { return utteranceId; }
	public Long getOffsetMs() { return offsetMs; }
	public String getLabel() { return label; }
	public Instant getCreatedAt() { return createdAt; }
	public Map<String, Object> getMetadata() {
		return metadata == null ? null : Map.copyOf(metadata);
	}

	private static String cleanOptional(String value) {
		if (value == null) return null;
		String cleaned = value.trim();
		return cleaned.isEmpty() ? null : cleaned;
	}
}

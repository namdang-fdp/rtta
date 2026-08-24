package com.rtta.dorriss.transcript;

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
@Table(name = "transcript_utterances")
public class TranscriptUtterance {

	@Id
	private UUID id;

	@Column(name = "meeting_id", nullable = false, updatable = false)
	private UUID meetingId;

	@Column(nullable = false, updatable = false)
	private long ordinal;

	@Column(name = "event_key", nullable = false, length = 64, updatable = false)
	private String eventKey;

	@Column(name = "source_text", nullable = false, columnDefinition = "text")
	private String sourceText;

	@Column(name = "translated_text", nullable = false, columnDefinition = "text")
	private String translatedText;

	@Column(name = "offset_ms", nullable = false, updatable = false)
	private long offsetMs;

	@Column(name = "duration_ms", nullable = false, updatable = false)
	private long durationMs;

	@Column(name = "observed_at", nullable = false, updatable = false)
	private Instant observedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "provider_metadata", columnDefinition = "jsonb")
	private Map<String, Object> providerMetadata;

	protected TranscriptUtterance() {
	}

	public TranscriptUtterance(
			UUID meetingId,
			long ordinal,
			String eventKey,
			String sourceText,
			String translatedText,
			long offsetMs,
			long durationMs,
			Instant observedAt,
			Instant createdAt,
			Map<String, Object> providerMetadata) {
		this.id = UUID.randomUUID();
		this.meetingId = Objects.requireNonNull(meetingId, "meetingId");
		this.ordinal = ordinal;
		this.eventKey = Objects.requireNonNull(eventKey, "eventKey");
		this.sourceText = Objects.requireNonNull(sourceText, "sourceText");
		this.translatedText = Objects.requireNonNull(translatedText, "translatedText");
		this.offsetMs = offsetMs;
		this.durationMs = durationMs;
		this.observedAt = Objects.requireNonNull(observedAt, "observedAt");
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
		this.providerMetadata = providerMetadata == null
				? null
				: new LinkedHashMap<>(providerMetadata);
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public long getOrdinal() { return ordinal; }
	public String getEventKey() { return eventKey; }
	public String getSourceText() { return sourceText; }
	public String getTranslatedText() { return translatedText; }
	public long getOffsetMs() { return offsetMs; }
	public long getDurationMs() { return durationMs; }
	public Instant getObservedAt() { return observedAt; }
	public Instant getCreatedAt() { return createdAt; }
	public Map<String, Object> getProviderMetadata() {
		return providerMetadata == null ? null : Map.copyOf(providerMetadata);
	}
}

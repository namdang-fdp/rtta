package com.rtta.dorriss.summary;

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
@Table(name = "meeting_summaries")
public class MeetingSummary {

	@Id
	private UUID id;

	@Column(name = "meeting_id", nullable = false, updatable = false)
	private UUID meetingId;

	@Column(nullable = false, length = 200, updatable = false)
	private String model;

	@Column(name = "summary_markdown", nullable = false, columnDefinition = "text", updatable = false)
	private String summaryMarkdown;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "structured_data", columnDefinition = "jsonb", updatable = false)
	private Map<String, Object> structuredData;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected MeetingSummary() {
	}

	public MeetingSummary(
			UUID meetingId,
			String model,
			String summaryMarkdown,
			Map<String, Object> structuredData,
			Instant createdAt) {
		this.id = UUID.randomUUID();
		this.meetingId = Objects.requireNonNull(meetingId, "meetingId");
		this.model = requireText(model, "model");
		this.summaryMarkdown = requireText(summaryMarkdown, "summaryMarkdown");
		this.structuredData = structuredData == null ? null : new LinkedHashMap<>(structuredData);
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public String getModel() { return model; }
	public String getSummaryMarkdown() { return summaryMarkdown; }
	public Map<String, Object> getStructuredData() {
		return structuredData == null ? null : Map.copyOf(structuredData);
	}
	public Instant getCreatedAt() { return createdAt; }

	private static String requireText(String value, String name) {
		Objects.requireNonNull(value, name);
		String cleaned = value.trim();
		if (cleaned.isEmpty()) throw new IllegalArgumentException(name + " must not be blank");
		return cleaned;
	}
}

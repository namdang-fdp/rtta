package com.rtta.dorriss.meeting;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "meetings")
public class Meeting {

	@Id
	private UUID id;

	@Column(name = "live_session_id", nullable = false, unique = true, updatable = false)
	private UUID liveSessionId;

	@Column(nullable = false)
	private String title;

	@Column(name = "source_language", nullable = false, length = 35)
	private String sourceLanguage;

	@Column(name = "target_language", nullable = false, length = 35)
	private String targetLanguage;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private MeetingStatus status;

	@Column(name = "started_at", nullable = false, updatable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private Map<String, Object> metadata = new LinkedHashMap<>();

	@Version
	@Column(nullable = false)
	private long version;

	protected Meeting() {
	}

	private Meeting(
			UUID id,
			UUID liveSessionId,
			String title,
			String sourceLanguage,
			String targetLanguage,
			Instant startedAt,
			Instant createdAt,
			Map<String, Object> metadata) {
		this.id = Objects.requireNonNull(id, "id");
		this.liveSessionId = Objects.requireNonNull(liveSessionId, "liveSessionId");
		this.title = requireText(title, "title");
		this.sourceLanguage = requireText(sourceLanguage, "sourceLanguage");
		this.targetLanguage = requireText(targetLanguage, "targetLanguage");
		this.status = MeetingStatus.LIVE;
		this.startedAt = Objects.requireNonNull(startedAt, "startedAt");
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
		this.updatedAt = createdAt;
		this.metadata = metadata == null ? new LinkedHashMap<>() : new LinkedHashMap<>(metadata);
	}

	public static Meeting start(
			UUID liveSessionId,
			String title,
			String sourceLanguage,
			String targetLanguage,
			Instant startedAt,
			Instant createdAt,
			Map<String, Object> metadata) {
		return new Meeting(
				UUID.randomUUID(),
				liveSessionId,
				title,
				sourceLanguage,
				targetLanguage,
				startedAt,
				createdAt,
				metadata);
	}

	public void complete(Instant endedAt, Instant updatedAt) {
		transitionTo(MeetingStatus.COMPLETED, endedAt, updatedAt);
	}

	public void fail(Instant endedAt, Instant updatedAt) {
		transitionTo(MeetingStatus.FAILED, endedAt, updatedAt);
	}

	private void transitionTo(MeetingStatus newStatus, Instant newEndedAt, Instant newUpdatedAt) {
		Objects.requireNonNull(newStatus, "newStatus");
		Objects.requireNonNull(newEndedAt, "endedAt");
		Objects.requireNonNull(newUpdatedAt, "updatedAt");
		if (newEndedAt.isBefore(startedAt)) {
			throw new IllegalArgumentException("endedAt must not be before startedAt");
		}
		if (status != MeetingStatus.LIVE) {
			return;
		}
		status = newStatus;
		endedAt = newEndedAt;
		updatedAt = newUpdatedAt;
	}

	public UUID getId() {
		return id;
	}

	public UUID getLiveSessionId() {
		return liveSessionId;
	}

	public String getTitle() {
		return title;
	}

	public String getSourceLanguage() {
		return sourceLanguage;
	}

	public String getTargetLanguage() {
		return targetLanguage;
	}

	public MeetingStatus getStatus() {
		return status;
	}

	public Instant getStartedAt() {
		return startedAt;
	}

	public Instant getEndedAt() {
		return endedAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public Map<String, Object> getMetadata() {
		return Map.copyOf(metadata);
	}

	private static String requireText(String value, String name) {
		Objects.requireNonNull(value, name);
		String cleaned = value.trim();
		if (cleaned.isEmpty()) {
			throw new IllegalArgumentException(name + " must not be blank");
		}
		return cleaned;
	}
}

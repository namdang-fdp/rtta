package com.rtta.dorriss.note;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "research_notes")
public class ResearchNote {

	@Id
	private UUID id;

	@Column(name = "meeting_id", nullable = false, updatable = false)
	private UUID meetingId;

	@Column(name = "utterance_id", updatable = false)
	private UUID utteranceId;

	@Column(name = "bookmark_id", updatable = false)
	private UUID bookmarkId;

	@Column(nullable = false, columnDefinition = "text")
	private String content;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected ResearchNote() {
	}

	public ResearchNote(
			UUID meetingId,
			UUID utteranceId,
			UUID bookmarkId,
			String content,
			Instant createdAt) {
		this.id = UUID.randomUUID();
		this.meetingId = Objects.requireNonNull(meetingId, "meetingId");
		this.utteranceId = utteranceId;
		this.bookmarkId = bookmarkId;
		this.content = requireContent(content);
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
		this.updatedAt = createdAt;
	}

	public void updateContent(String newContent, Instant updatedAt) {
		this.content = requireContent(newContent);
		this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public UUID getUtteranceId() { return utteranceId; }
	public UUID getBookmarkId() { return bookmarkId; }
	public String getContent() { return content; }
	public Instant getCreatedAt() { return createdAt; }
	public Instant getUpdatedAt() { return updatedAt; }

	private static String requireContent(String value) {
		Objects.requireNonNull(value, "content");
		String cleaned = value.trim();
		if (cleaned.isEmpty()) throw new IllegalArgumentException("content must not be blank");
		return cleaned;
	}
}

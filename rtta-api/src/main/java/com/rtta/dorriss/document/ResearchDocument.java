package com.rtta.dorriss.document;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "documents")
public class ResearchDocument {

	@Id
	private UUID id;

	@Column(name = "meeting_id", updatable = false)
	private UUID meetingId;

	@Column(name = "file_name", nullable = false, updatable = false)
	private String fileName;

	@Column(name = "media_type", nullable = false, length = 255, updatable = false)
	private String mediaType;

	@Column(name = "size_bytes", nullable = false, updatable = false)
	private long sizeBytes;

	@Column(nullable = false, length = 64, updatable = false)
	private String sha256;

	@Column(name = "object_key", nullable = false, unique = true, updatable = false)
	private String objectKey;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private DocumentStatus status;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "processed_at")
	private Instant processedAt;

	@Column(name = "error_message", columnDefinition = "text")
	private String errorMessage;

	protected ResearchDocument() {
	}

	public ResearchDocument(
			UUID meetingId,
			String fileName,
			String mediaType,
			long sizeBytes,
			String sha256,
			String objectKey,
			Instant createdAt) {
		if (sizeBytes < 0) throw new IllegalArgumentException("sizeBytes must not be negative");
		this.id = UUID.randomUUID();
		this.meetingId = meetingId;
		this.fileName = requireText(fileName, "fileName");
		this.mediaType = requireText(mediaType, "mediaType");
		this.sizeBytes = sizeBytes;
		this.sha256 = requireText(sha256, "sha256");
		this.objectKey = requireText(objectKey, "objectKey");
		this.status = DocumentStatus.UPLOADED;
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
	}

	public void markProcessing() {
		status = DocumentStatus.PROCESSING;
		errorMessage = null;
	}

	public void markReady(Instant processedAt) {
		status = DocumentStatus.READY;
		this.processedAt = Objects.requireNonNull(processedAt, "processedAt");
		errorMessage = null;
	}

	public void markFailed(String errorMessage, Instant processedAt) {
		status = DocumentStatus.FAILED;
		this.errorMessage = requireText(errorMessage, "errorMessage");
		this.processedAt = Objects.requireNonNull(processedAt, "processedAt");
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public String getFileName() { return fileName; }
	public String getMediaType() { return mediaType; }
	public long getSizeBytes() { return sizeBytes; }
	public String getSha256() { return sha256; }
	public String getObjectKey() { return objectKey; }
	public DocumentStatus getStatus() { return status; }
	public Instant getCreatedAt() { return createdAt; }
	public Instant getProcessedAt() { return processedAt; }
	public String getErrorMessage() { return errorMessage; }

	private static String requireText(String value, String name) {
		Objects.requireNonNull(value, name);
		String cleaned = value.trim();
		if (cleaned.isEmpty()) throw new IllegalArgumentException(name + " must not be blank");
		return cleaned;
	}
}

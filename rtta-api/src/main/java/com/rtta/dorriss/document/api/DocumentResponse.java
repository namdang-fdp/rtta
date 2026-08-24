package com.rtta.dorriss.document.api;

import java.time.Instant;
import java.util.UUID;

import com.rtta.dorriss.document.DocumentStatus;
import com.rtta.dorriss.document.ResearchDocument;

public record DocumentResponse(
		UUID id,
		UUID meetingId,
		String fileName,
		String mediaType,
		long sizeBytes,
		String sha256,
		DocumentStatus status,
		Instant createdAt,
		Instant processedAt,
		String errorMessage) {

	public static DocumentResponse from(ResearchDocument document) {
		return new DocumentResponse(
				document.getId(), document.getMeetingId(), document.getFileName(),
				document.getMediaType(), document.getSizeBytes(), document.getSha256(),
				document.getStatus(), document.getCreatedAt(), document.getProcessedAt(),
				document.getErrorMessage());
	}
}

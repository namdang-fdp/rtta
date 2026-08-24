package com.rtta.dorriss.storage;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "rtta.storage.minio")
public class ObjectStorageProperties {

	private String endpoint = "http://localhost:9000";
	private String accessKey = "";
	private String secretKey = "";
	private String recordingsBucket = "rtta-recordings";
	private String documentsBucket = "rtta-documents";
	private Duration presignedUrlDuration = Duration.ofMinutes(15);

	public String getEndpoint() { return endpoint; }
	public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
	public String getAccessKey() { return accessKey; }
	public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
	public String getSecretKey() { return secretKey; }
	public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
	public String getRecordingsBucket() { return recordingsBucket; }
	public void setRecordingsBucket(String recordingsBucket) { this.recordingsBucket = recordingsBucket; }
	public String getDocumentsBucket() { return documentsBucket; }
	public void setDocumentsBucket(String documentsBucket) { this.documentsBucket = documentsBucket; }
	public Duration getPresignedUrlDuration() { return presignedUrlDuration; }
	public void setPresignedUrlDuration(Duration presignedUrlDuration) { this.presignedUrlDuration = presignedUrlDuration; }

	public String requiredEndpoint() { return required(endpoint, "RTTA_MINIO_ENDPOINT"); }
	public String requiredAccessKey() { return required(accessKey, "RTTA_MINIO_ACCESS_KEY"); }
	public String requiredSecretKey() { return required(secretKey, "RTTA_MINIO_SECRET_KEY"); }
	public String requiredRecordingsBucket() { return required(recordingsBucket, "RTTA_MINIO_RECORDINGS_BUCKET"); }
	public String requiredDocumentsBucket() { return required(documentsBucket, "RTTA_MINIO_DOCUMENTS_BUCKET"); }

	private String required(String value, String name) {
		if (value == null || value.trim().isEmpty()) throw new ObjectStorageException(name + " is not configured");
		return value.trim();
	}
}

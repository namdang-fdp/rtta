package com.rtta.dorriss.storage;

import java.net.URI;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.Http.Method;
import io.minio.MinioClient;
import io.minio.UploadObjectArgs;
import org.springframework.stereotype.Component;

@Component
public class MinioObjectStorage {

	private final ObjectStorageProperties properties;
	private volatile MinioClient client;

	public MinioObjectStorage(ObjectStorageProperties properties) {
		this.properties = properties;
	}

	public void upload(String bucket, String objectKey, Path file, String contentType) {
		try {
			client().uploadObject(UploadObjectArgs.builder()
					.bucket(bucket)
					.object(objectKey)
					.filename(file.toString())
					.contentType(contentType)
					.build());
		}
		catch (Exception exception) {
			throw new ObjectStorageException("Object upload failed", exception);
		}
	}

	public URI presignedGet(String bucket, String objectKey) {
		try {
			long seconds = properties.getPresignedUrlDuration().toSeconds();
			int expirySeconds = Math.toIntExact(Math.max(1, Math.min(seconds, 604_800)));
			return URI.create(client().getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
					.method(Method.GET)
					.bucket(bucket)
					.object(objectKey)
					.expiry(expirySeconds, TimeUnit.SECONDS)
					.build()));
		}
		catch (Exception exception) {
			throw new ObjectStorageException("Object playback URL creation failed", exception);
		}
	}

	private MinioClient client() {
		MinioClient current = client;
		if (current != null) return current;
		synchronized (this) {
			if (client == null) {
				client = MinioClient.builder()
						.endpoint(properties.requiredEndpoint())
						.credentials(properties.requiredAccessKey(), properties.requiredSecretKey())
						.build();
			}
			return client;
		}
	}
}

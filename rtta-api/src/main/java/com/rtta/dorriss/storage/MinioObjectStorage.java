package com.rtta.dorriss.storage;

import java.io.InputStream;
import java.nio.file.Path;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
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

	public long size(String bucket, String objectKey) {
		try {
			return client().statObject(StatObjectArgs.builder()
					.bucket(bucket)
					.object(objectKey)
					.build()).size();
		}
		catch (Exception exception) {
			throw new ObjectStorageException("Object metadata lookup failed", exception);
		}
	}

	public InputStream open(String bucket, String objectKey, long offset, long length) {
		try {
			return client().getObject(GetObjectArgs.builder()
					.bucket(bucket)
					.object(objectKey)
					.offset(offset)
					.length(length)
					.build());
		}
		catch (Exception exception) {
			throw new ObjectStorageException("Object stream could not be opened", exception);
		}
	}

	public void delete(String bucket, String objectKey) {
		try {
			client().removeObject(RemoveObjectArgs.builder()
					.bucket(bucket)
					.object(objectKey)
					.build());
		}
		catch (Exception exception) {
			throw new ObjectStorageException("Object deletion failed", exception);
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

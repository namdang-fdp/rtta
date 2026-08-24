package com.rtta.dorriss.document;

import java.nio.file.Path;

import com.rtta.dorriss.storage.MinioObjectStorage;
import com.rtta.dorriss.storage.ObjectStorageProperties;
import org.springframework.stereotype.Component;

@Component
public class MinioDocumentStorage implements DocumentStorage {

	private final MinioObjectStorage storage;
	private final ObjectStorageProperties properties;

	public MinioDocumentStorage(MinioObjectStorage storage, ObjectStorageProperties properties) {
		this.storage = storage;
		this.properties = properties;
	}

	@Override
	public void upload(String objectKey, Path file, String mediaType) {
		storage.upload(properties.requiredDocumentsBucket(), objectKey, file, mediaType);
	}

	@Override
	public void delete(String objectKey) {
		storage.delete(properties.requiredDocumentsBucket(), objectKey);
	}
}

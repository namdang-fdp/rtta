package com.rtta.dorriss.recording;

import java.io.InputStream;
import java.nio.file.Path;

import com.rtta.dorriss.storage.MinioObjectStorage;
import com.rtta.dorriss.storage.ObjectStorageProperties;
import org.springframework.stereotype.Component;

@Component
public class MinioRecordingStorage implements RecordingStorage {

	private final MinioObjectStorage objectStorage;
	private final ObjectStorageProperties properties;

	public MinioRecordingStorage(
			MinioObjectStorage objectStorage,
			ObjectStorageProperties properties) {
		this.objectStorage = objectStorage;
		this.properties = properties;
	}

	@Override
	public void upload(String objectKey, Path wavFile) {
		objectStorage.upload(
				properties.requiredRecordingsBucket(), objectKey, wavFile, "audio/wav");
	}

	@Override
	public long size(String objectKey) {
		return objectStorage.size(properties.requiredRecordingsBucket(), objectKey);
	}

	@Override
	public InputStream open(String objectKey, long offset, long length) {
		return objectStorage.open(
				properties.requiredRecordingsBucket(), objectKey, offset, length);
	}
}

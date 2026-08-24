package com.rtta.dorriss.recording;

import java.net.URI;
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
	public URI playbackUrl(String objectKey) {
		return objectStorage.presignedGet(properties.requiredRecordingsBucket(), objectKey);
	}
}

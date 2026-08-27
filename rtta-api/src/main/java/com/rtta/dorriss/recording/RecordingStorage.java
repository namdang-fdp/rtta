package com.rtta.dorriss.recording;

import java.io.InputStream;
import java.nio.file.Path;

public interface RecordingStorage {

	void upload(String objectKey, Path wavFile);

	long size(String objectKey);

	InputStream open(String objectKey, long offset, long length);
}

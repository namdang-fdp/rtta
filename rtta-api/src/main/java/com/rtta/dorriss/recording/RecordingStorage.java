package com.rtta.dorriss.recording;

import java.net.URI;
import java.nio.file.Path;

public interface RecordingStorage {

	void upload(String objectKey, Path wavFile);

	URI playbackUrl(String objectKey);
}

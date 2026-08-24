package com.rtta.dorriss.document;

import java.nio.file.Path;

public interface DocumentStorage {

	void upload(String objectKey, Path file, String mediaType);

	void delete(String objectKey);
}

package com.rtta.dorriss.document;

import java.util.Map;

public record PreparedDocumentChunk(int index, String content, Map<String, Object> metadata) {
}

package com.rtta.dorriss.document;

import java.util.Map;

public record ExtractedSection(String content, Map<String, Object> metadata) {
}

package com.rtta.dorriss.document;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DocumentChunker {

	private final int targetSize;
	private final int overlap;

	public DocumentChunker(
			@Value("${rtta.documents.chunk-size:1200}") int targetSize,
			@Value("${rtta.documents.chunk-overlap:150}") int overlap) {
		if (targetSize < 400) throw new IllegalArgumentException("Document chunk size must be at least 400");
		if (overlap < 0 || overlap >= targetSize / 2) {
			throw new IllegalArgumentException("Document chunk overlap must be non-negative and less than half the chunk size");
		}
		this.targetSize = targetSize;
		this.overlap = overlap;
	}

	public List<PreparedDocumentChunk> chunk(List<ExtractedSection> sections) {
		List<PreparedDocumentChunk> chunks = new ArrayList<>();
		for (int sectionIndex = 0; sectionIndex < sections.size(); sectionIndex++) {
			ExtractedSection section = sections.get(sectionIndex);
			String content = section.content().trim();
			int cursor = 0;
			while (cursor < content.length()) {
				int hardEnd = Math.min(content.length(), cursor + targetSize);
				int end = boundary(content, cursor, hardEnd);
				String chunkContent = content.substring(cursor, end).trim();
				if (!chunkContent.isBlank()) {
					Map<String, Object> metadata = new LinkedHashMap<>(section.metadata());
					metadata.put("sectionIndex", sectionIndex);
					chunks.add(new PreparedDocumentChunk(chunks.size(), chunkContent, Map.copyOf(metadata)));
				}
				if (end >= content.length()) break;
				int next = Math.max(cursor + 1, end - overlap);
				while (next < end && !Character.isWhitespace(content.charAt(next))) next++;
				while (next < content.length() && Character.isWhitespace(content.charAt(next))) next++;
				cursor = next;
			}
		}
		return List.copyOf(chunks);
	}

	private int boundary(String content, int start, int hardEnd) {
		if (hardEnd == content.length()) return hardEnd;
		int minimum = Math.min(hardEnd, start + Math.max(300, targetSize / 2));
		int paragraph = content.lastIndexOf("\n\n", hardEnd);
		if (paragraph >= minimum) return paragraph;
		int sentence = Math.max(
				content.lastIndexOf(". ", hardEnd),
				Math.max(content.lastIndexOf("? ", hardEnd), content.lastIndexOf("! ", hardEnd)));
		if (sentence >= minimum) return sentence + 1;
		int whitespace = content.lastIndexOf(' ', hardEnd);
		return whitespace >= minimum ? whitespace : hardEnd;
	}
}

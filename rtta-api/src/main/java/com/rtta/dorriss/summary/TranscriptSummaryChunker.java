package com.rtta.dorriss.summary;

import java.util.ArrayList;
import java.util.List;

import com.rtta.dorriss.transcript.TranscriptUtterance;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TranscriptSummaryChunker {

	private static final int MAX_CHUNKS = 20;
	private final int baseCharacterBudget;

	public TranscriptSummaryChunker(
			@Value("${rtta.ai.summary.chunk-character-budget:60000}") int baseCharacterBudget) {
		if (baseCharacterBudget < 1_000) {
			throw new IllegalArgumentException("Summary chunk budget must be at least 1000 characters");
		}
		this.baseCharacterBudget = baseCharacterBudget;
	}

	public List<TranscriptSummaryChunk> chunk(List<TranscriptUtterance> utterances) {
		if (utterances.isEmpty()) return List.of();
		List<String> lines = utterances.stream().map(this::format).toList();
		long totalCharacters = lines.stream().mapToLong(String::length).sum();
		int budget = (int) Math.min(
				Integer.MAX_VALUE,
				Math.max(baseCharacterBudget, (totalCharacters + MAX_CHUNKS - 1) / MAX_CHUNKS));

		List<TranscriptSummaryChunk> chunks = new ArrayList<>();
		StringBuilder content = new StringBuilder();
		int count = 0;
		long startOffset = 0;
		long endOffset = 0;
		for (int index = 0; index < utterances.size(); index++) {
			TranscriptUtterance utterance = utterances.get(index);
			String line = lines.get(index);
			if (content.length() > 0
					&& chunks.size() < MAX_CHUNKS - 1
					&& content.length() + line.length() > budget) {
				chunks.add(new TranscriptSummaryChunk(
						chunks.size(), startOffset, endOffset, count, content.toString()));
				content.setLength(0);
				count = 0;
			}
			if (count == 0) startOffset = utterance.getOffsetMs();
			content.append(line);
			count++;
			endOffset = utterance.getOffsetMs() + utterance.getDurationMs();
		}
		if (count > 0) {
			chunks.add(new TranscriptSummaryChunk(
					chunks.size(), startOffset, endOffset, count, content.toString()));
		}
		return List.copyOf(chunks);
	}

	private String format(TranscriptUtterance utterance) {
		return "[%d ms]\nEN: %s\nVI: %s\n\n".formatted(
				utterance.getOffsetMs(),
				utterance.getSourceText(),
				utterance.getTranslatedText());
	}
}

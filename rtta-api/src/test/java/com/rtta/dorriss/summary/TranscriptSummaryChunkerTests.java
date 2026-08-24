package com.rtta.dorriss.summary;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import com.rtta.dorriss.transcript.TranscriptUtterance;
import org.junit.jupiter.api.Test;

class TranscriptSummaryChunkerTests {

	@Test
	void preservesChronologicalUtterancesWithoutExceedingTwentyChunks() {
		List<TranscriptUtterance> utterances = IntStream.range(0, 41)
				.mapToObj(index -> utterance(index, "source-%02d-%s".formatted(index, "x".repeat(700))))
				.toList();

		List<TranscriptSummaryChunk> chunks = new TranscriptSummaryChunker(1_000).chunk(utterances);

		assertThat(chunks).hasSizeLessThanOrEqualTo(20);
		String combined = chunks.stream().map(TranscriptSummaryChunk::content)
				.reduce("", String::concat);
		for (int index = 0; index < utterances.size(); index++) {
			assertThat(combined).contains("source-%02d-".formatted(index));
		}
		assertThat(chunks).extracting(TranscriptSummaryChunk::index)
				.containsExactly(IntStream.range(0, chunks.size()).boxed().toArray(Integer[]::new));
	}

	@Test
	void keepsAnOversizedUtteranceWhole() {
		TranscriptUtterance utterance = utterance(0, "x".repeat(2_000));

		List<TranscriptSummaryChunk> chunks = new TranscriptSummaryChunker(1_000)
				.chunk(List.of(utterance));

		assertThat(chunks).hasSize(1);
		assertThat(chunks.getFirst().utteranceCount()).isEqualTo(1);
		assertThat(chunks.getFirst().content()).contains("x".repeat(2_000));
	}

	private TranscriptUtterance utterance(int ordinal, String source) {
		Instant at = Instant.parse("2026-08-25T00:00:00Z");
		return new TranscriptUtterance(
				UUID.randomUUID(), ordinal, "a".repeat(64), source, "dịch-" + ordinal,
				ordinal * 1_000L, 800, at, at, Map.of());
	}
}

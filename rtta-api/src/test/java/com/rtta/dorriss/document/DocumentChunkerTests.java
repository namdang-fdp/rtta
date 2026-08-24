package com.rtta.dorriss.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class DocumentChunkerTests {

	@Test
	void preservesSectionMetadataAndUsesBoundedOverlappingTextChunks() {
		String paragraph = "Hamiltonian dynamics describe time evolution in this experiment. ".repeat(20);
		List<PreparedDocumentChunk> chunks = new DocumentChunker(500, 60).chunk(List.of(
				new ExtractedSection(paragraph + "\n\n" + paragraph, Map.of("pageNumber", 3))));

		assertThat(chunks).hasSizeGreaterThan(2);
		assertThat(chunks).allSatisfy(chunk -> {
			assertThat(chunk.content()).isNotBlank().hasSizeLessThanOrEqualTo(500);
			assertThat(chunk.metadata()).containsEntry("pageNumber", 3).containsEntry("sectionIndex", 0);
		});
		assertThat(chunks).extracting(PreparedDocumentChunk::index)
				.containsExactlyElementsOf(java.util.stream.IntStream.range(0, chunks.size()).boxed().toList());
	}
}

package com.rtta.dorriss.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.atLeastOnce;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.rtta.dorriss.ai.ResearchAiProvider;
import com.rtta.dorriss.meeting.MeetingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class ResearchDocumentServiceTests {

	@Mock MeetingRepository meetingRepository;
	@Mock ResearchDocumentRepository documentRepository;
	@Mock DocumentChunkJdbcRepository chunkRepository;
	@Mock DocumentStorage storage;
	@Mock ResearchAiProvider aiProvider;
	@TempDir Path tempDirectory;

	private UUID meetingId;
	private ResearchDocumentService service;

	@BeforeEach
	void setUp() {
		meetingId = UUID.randomUUID();
		when(meetingRepository.existsById(meetingId)).thenReturn(true);
		when(documentRepository.findFirstByMeetingIdAndSha256(any(), any())).thenReturn(Optional.empty());
		when(documentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
		service = new ResearchDocumentService(
				meetingRepository, documentRepository, chunkRepository, storage,
				new DocumentTextExtractor(), new DocumentChunker(500, 50), aiProvider,
				new SyncTaskExecutor(), tempDirectory, 1_000_000, 20, 10,
				Clock.fixed(Instant.parse("2026-08-25T00:00:00Z"), ZoneOffset.UTC));
	}

	@Test
	void storesMetadataEmbedsChunksAndMarksAPlainTextDocumentReady() {
		when(aiProvider.embedAll(any())).thenAnswer(invocation -> {
			List<String> texts = invocation.getArgument(0);
			return texts.stream().map(ignored -> List.of(1F, 0F, 0F)).toList();
		});

		var response = service.upload(meetingId, new MockMultipartFile(
				"file", "paper.txt", "text/plain",
				("Hamiltonian time evolution. ".repeat(35)).getBytes()));

		assertThat(response.status()).isEqualTo(DocumentStatus.READY);
		assertThat(response.sha256()).hasSize(64);
		verify(storage).upload(any(), any(), any());
		verify(chunkRepository, atLeastOnce()).insert(any(), any(), any());
	}

	@Test
	void embeddingFailureMarksOnlyTheDocumentFailedAndCleansPartialChunks() {
		when(aiProvider.embedAll(any())).thenThrow(new IllegalStateException("provider unavailable"));

		var response = service.upload(meetingId, new MockMultipartFile(
				"file", "paper.txt", "text/plain", "scientific content".getBytes()));

		assertThat(response.status()).isEqualTo(DocumentStatus.FAILED);
		assertThat(response.errorMessage()).isEqualTo("Document processing failed");
		verify(chunkRepository).deleteAllByDocumentId(response.id());
	}
}

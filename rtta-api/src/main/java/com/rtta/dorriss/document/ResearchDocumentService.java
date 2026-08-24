package com.rtta.dorriss.document;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.DigestInputStream;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.rtta.dorriss.ai.ResearchAiProvider;
import com.rtta.dorriss.document.api.DocumentResponse;
import com.rtta.dorriss.meeting.MeetingNotFoundException;
import com.rtta.dorriss.meeting.MeetingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ResearchDocumentService {

	private static final Logger LOGGER = LoggerFactory.getLogger(ResearchDocumentService.class);
	private static final Set<String> SUPPORTED_EXTENSIONS = Set.of("pdf", "pptx", "txt", "docx");
	private static final Map<String, String> CANONICAL_MEDIA_TYPES = Map.of(
			"pdf", "application/pdf",
			"pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"txt", "text/plain",
			"docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

	private final MeetingRepository meetingRepository;
	private final ResearchDocumentRepository documentRepository;
	private final DocumentChunkJdbcRepository chunkRepository;
	private final DocumentStorage storage;
	private final DocumentTextExtractor extractor;
	private final DocumentChunker chunker;
	private final ResearchAiProvider aiProvider;
	private final TaskExecutor taskExecutor;
	private final Path tempDirectory;
	private final long maxSizeBytes;
	private final int maxChunks;
	private final int embeddingBatchSize;
	private final Clock clock;

	@Autowired
	public ResearchDocumentService(
			MeetingRepository meetingRepository,
			ResearchDocumentRepository documentRepository,
			DocumentChunkJdbcRepository chunkRepository,
			DocumentStorage storage,
			DocumentTextExtractor extractor,
			DocumentChunker chunker,
			ResearchAiProvider aiProvider,
			TaskExecutor taskExecutor,
			@Value("${rtta.documents.temp-directory:${java.io.tmpdir}/rtta-documents}") Path tempDirectory,
			@Value("${rtta.documents.max-size-bytes:52428800}") long maxSizeBytes,
			@Value("${rtta.documents.max-chunks:500}") int maxChunks,
			@Value("${rtta.documents.embedding-batch-size:20}") int embeddingBatchSize) {
		this(meetingRepository, documentRepository, chunkRepository, storage, extractor, chunker,
				aiProvider, taskExecutor, tempDirectory, maxSizeBytes, maxChunks, embeddingBatchSize,
				Clock.systemUTC());
	}

	ResearchDocumentService(
			MeetingRepository meetingRepository,
			ResearchDocumentRepository documentRepository,
			DocumentChunkJdbcRepository chunkRepository,
			DocumentStorage storage,
			DocumentTextExtractor extractor,
			DocumentChunker chunker,
			ResearchAiProvider aiProvider,
			TaskExecutor taskExecutor,
			Path tempDirectory,
			long maxSizeBytes,
			int maxChunks,
			int embeddingBatchSize,
			Clock clock) {
		this.meetingRepository = meetingRepository;
		this.documentRepository = documentRepository;
		this.chunkRepository = chunkRepository;
		this.storage = storage;
		this.extractor = extractor;
		this.chunker = chunker;
		this.aiProvider = aiProvider;
		this.taskExecutor = taskExecutor;
		this.tempDirectory = tempDirectory;
		this.maxSizeBytes = maxSizeBytes;
		this.maxChunks = maxChunks;
		this.embeddingBatchSize = Math.max(1, Math.min(embeddingBatchSize, 100));
		this.clock = clock;
	}

	public List<DocumentResponse> list(UUID meetingId) {
		requireMeeting(meetingId);
		return documentRepository.findAllByMeetingIdOrderByCreatedAtDescIdDesc(meetingId)
				.stream().map(DocumentResponse::from).toList();
	}

	public DocumentResponse upload(UUID meetingId, MultipartFile multipart) {
		requireMeeting(meetingId);
		if (multipart == null || multipart.isEmpty()) throw badRequest("Choose a non-empty research document");
		if (multipart.getSize() > maxSizeBytes) throw tooLarge();
		String fileName = safeFileName(multipart.getOriginalFilename());
		String extension = extension(fileName);
		if (!SUPPORTED_EXTENSIONS.contains(extension)) throw badRequest("Supported document formats are PDF, PPTX, TXT, and DOCX");

		Path temporary = null;
		try {
			Files.createDirectories(tempDirectory);
			temporary = Files.createTempFile(tempDirectory, "rtta-document-", ".upload");
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			try (InputStream input = multipart.getInputStream(); DigestInputStream hashing = new DigestInputStream(input, digest)) {
				Files.copy(hashing, temporary, StandardCopyOption.REPLACE_EXISTING);
			}
			long actualSize = Files.size(temporary);
			if (actualSize == 0) throw badRequest("Choose a non-empty research document");
			if (actualSize > maxSizeBytes) throw tooLarge();
			String detected = extractor.detect(temporary, fileName);
			String mediaType = CANONICAL_MEDIA_TYPES.get(extension);
			if (!compatible(mediaType, detected)) throw badRequest("The uploaded content does not match its file type");
			String sha256 = HexFormat.of().formatHex(digest.digest());
			var duplicate = documentRepository.findFirstByMeetingIdAndSha256(meetingId, sha256);
			if (duplicate.isPresent()) {
				Files.deleteIfExists(temporary);
				return DocumentResponse.from(duplicate.get());
			}

			String objectKey = meetingId + "/" + UUID.randomUUID() + "-" + fileName;
			storage.upload(objectKey, temporary, mediaType);
			ResearchDocument document = documentRepository.save(new ResearchDocument(
					meetingId, fileName, mediaType, actualSize, sha256, objectKey, clock.instant()));
			document.markProcessing();
			documentRepository.save(document);
			Path processingFile = temporary;
			try {
				taskExecutor.execute(() -> process(document, processingFile));
			}
			catch (RuntimeException exception) {
				document.markFailed("Document processing could not be scheduled", clock.instant());
				documentRepository.save(document);
				deleteQuietly(processingFile);
			}
			return DocumentResponse.from(document);
		}
		catch (ResponseStatusException exception) {
			deleteQuietly(temporary);
			throw exception;
		}
		catch (Exception exception) {
			deleteQuietly(temporary);
			LOGGER.warn("RTTA DOCUMENT uploadFailed meeting={} cause={}", meetingId, exception.getClass().getSimpleName());
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
					"The research document could not be stored right now");
		}
	}

	public void delete(UUID meetingId, UUID documentId) {
		requireMeeting(meetingId);
		ResearchDocument document = documentRepository.findByIdAndMeetingId(documentId, meetingId)
				.orElseThrow(() -> new DocumentNotFoundException(documentId));
		if (document.getStatus() == DocumentStatus.PROCESSING || document.getStatus() == DocumentStatus.UPLOADED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Wait for document processing to finish before removing it");
		}
		try {
			storage.delete(document.getObjectKey());
			documentRepository.delete(document);
		}
		catch (RuntimeException exception) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
					"The research document could not be removed right now");
		}
	}

	private void process(ResearchDocument document, Path file) {
		try {
			List<PreparedDocumentChunk> chunks = chunker.chunk(extractor.extract(file, document.getMediaType()));
			if (chunks.isEmpty()) throw new IllegalArgumentException("No extractable text was found");
			if (chunks.size() > maxChunks) throw new IllegalArgumentException("Document exceeds the chunk limit");
			for (int start = 0; start < chunks.size(); start += embeddingBatchSize) {
				List<PreparedDocumentChunk> batch = chunks.subList(start, Math.min(chunks.size(), start + embeddingBatchSize));
				List<List<Float>> embeddings = aiProvider.embedAll(
						batch.stream().map(PreparedDocumentChunk::content).toList());
				if (embeddings.size() != batch.size()) throw new IllegalStateException("Embedding batch was incomplete");
				for (int index = 0; index < batch.size(); index++) {
					chunkRepository.insert(document.getId(), batch.get(index), embeddings.get(index));
				}
			}
			document.markReady(clock.instant());
			documentRepository.save(document);
		}
		catch (Exception exception) {
			try {
				chunkRepository.deleteAllByDocumentId(document.getId());
			}
			catch (RuntimeException cleanupException) {
				LOGGER.warn("RTTA DOCUMENT chunkCleanupFailed document={} cause={}",
						document.getId(), cleanupException.getClass().getSimpleName());
			}
			document.markFailed("Document processing failed", clock.instant());
			try {
				documentRepository.save(document);
			}
			catch (RuntimeException persistenceException) {
				LOGGER.error("RTTA DOCUMENT failurePersistenceFailed document={} cause={}",
						document.getId(), persistenceException.getClass().getSimpleName());
			}
			LOGGER.warn("RTTA DOCUMENT processingFailed document={} cause={}",
					document.getId(), exception.getClass().getSimpleName());
		}
		finally {
			deleteQuietly(file);
		}
	}

	private boolean compatible(String expected, String detected) {
		if (expected.equals(detected)) return true;
		return expected.equals("text/plain") && detected.startsWith("text/");
	}

	private String safeFileName(String original) {
		if (original == null || original.isBlank()) throw badRequest("A safe file name is required");
		String leaf = original.replace('\\', '/');
		leaf = leaf.substring(leaf.lastIndexOf('/') + 1)
				.replaceAll("[\\p{Cntrl}]", "_")
				.replaceAll("[^\\p{L}\\p{N}._ -]", "_")
				.trim();
		if (leaf.isBlank() || leaf.equals(".") || leaf.equals("..")) throw badRequest("A safe file name is required");
		if (leaf.length() > 200) leaf = leaf.substring(leaf.length() - 200);
		return leaf;
	}

	private String extension(String fileName) {
		int dot = fileName.lastIndexOf('.');
		return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
	}

	private void requireMeeting(UUID meetingId) {
		if (!meetingRepository.existsById(meetingId)) throw new MeetingNotFoundException(meetingId);
	}

	private void deleteQuietly(Path file) {
		if (file == null) return;
		try { Files.deleteIfExists(file); }
		catch (Exception ignored) { }
	}

	private ResponseStatusException badRequest(String reason) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
	}

	private ResponseStatusException tooLarge() {
		return new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The research document is too large");
	}
}

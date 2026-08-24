package com.rtta.dorriss.document.api;

import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.document.ResearchDocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/meetings/{meetingId}/documents")
public class ResearchDocumentController {

	private final ResearchDocumentService documentService;

	public ResearchDocumentController(ResearchDocumentService documentService) {
		this.documentService = documentService;
	}

	@GetMapping
	public List<DocumentResponse> list(@PathVariable UUID meetingId) {
		return documentService.list(meetingId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.ACCEPTED)
	public DocumentResponse upload(
			@PathVariable UUID meetingId,
			@RequestPart("file") MultipartFile file) {
		return documentService.upload(meetingId, file);
	}

	@DeleteMapping("/{documentId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID meetingId, @PathVariable UUID documentId) {
		documentService.delete(meetingId, documentId);
	}
}

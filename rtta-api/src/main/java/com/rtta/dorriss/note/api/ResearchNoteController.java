package com.rtta.dorriss.note.api;

import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.note.ResearchNoteService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings/{meetingId}/notes")
public class ResearchNoteController {

	private final ResearchNoteService noteService;

	public ResearchNoteController(ResearchNoteService noteService) {
		this.noteService = noteService;
	}

	@GetMapping
	public List<ResearchNoteResponse> list(@PathVariable UUID meetingId) {
		return noteService.list(meetingId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ResearchNoteResponse create(
			@PathVariable UUID meetingId,
			@RequestBody CreateResearchNoteRequest request) {
		return noteService.create(meetingId, request);
	}

	@PatchMapping("/{noteId}")
	public ResearchNoteResponse update(
			@PathVariable UUID meetingId,
			@PathVariable UUID noteId,
			@RequestBody UpdateResearchNoteRequest request) {
		return noteService.update(meetingId, noteId, request);
	}

	@DeleteMapping("/{noteId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@PathVariable UUID meetingId,
			@PathVariable UUID noteId) {
		noteService.delete(meetingId, noteId);
	}
}

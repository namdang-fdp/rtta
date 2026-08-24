package com.rtta.dorriss.bookmark.api;

import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.bookmark.BookmarkService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings/{meetingId}/bookmarks")
public class BookmarkController {

	private final BookmarkService bookmarkService;

	public BookmarkController(BookmarkService bookmarkService) {
		this.bookmarkService = bookmarkService;
	}

	@GetMapping
	public List<BookmarkResponse> list(@PathVariable UUID meetingId) {
		return bookmarkService.list(meetingId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public BookmarkResponse create(
			@PathVariable UUID meetingId,
			@RequestBody CreateBookmarkRequest request) {
		return bookmarkService.create(meetingId, request);
	}

	@DeleteMapping("/{bookmarkId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@PathVariable UUID meetingId,
			@PathVariable UUID bookmarkId) {
		bookmarkService.delete(meetingId, bookmarkId);
	}
}

package com.rtta.dorriss.bookmark;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class BookmarkNotFoundException extends RuntimeException {

	public BookmarkNotFoundException(UUID bookmarkId) {
		super("Bookmark not found: " + bookmarkId);
	}
}

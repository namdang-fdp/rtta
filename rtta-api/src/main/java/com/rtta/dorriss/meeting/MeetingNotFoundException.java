package com.rtta.dorriss.meeting;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public final class MeetingNotFoundException extends RuntimeException {

	public MeetingNotFoundException(UUID id) {
		super("Meeting not found: " + id);
	}
}

package com.rtta.dorriss.recording;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class RecordingNotFoundException extends RuntimeException {

	public RecordingNotFoundException(UUID id) {
		super("Recording not found: " + id);
	}
}

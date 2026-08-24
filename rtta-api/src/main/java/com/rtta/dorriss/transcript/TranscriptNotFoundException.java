package com.rtta.dorriss.transcript;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public final class TranscriptNotFoundException extends RuntimeException {

	public TranscriptNotFoundException(UUID utteranceId) {
		super("Transcript utterance not found: " + utteranceId);
	}
}

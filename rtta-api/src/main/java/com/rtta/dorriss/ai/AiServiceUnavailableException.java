package com.rtta.dorriss.ai;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class AiServiceUnavailableException extends RuntimeException {

	public AiServiceUnavailableException() {
		super("RTTA AI could not complete this request right now. Please try again explicitly.");
	}
}

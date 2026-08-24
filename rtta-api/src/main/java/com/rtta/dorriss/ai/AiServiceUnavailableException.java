package com.rtta.dorriss.ai;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class AiServiceUnavailableException extends RuntimeException {

	public AiServiceUnavailableException() {
		super("RTTA could not generate the explanation right now. Please try again explicitly.");
	}
}

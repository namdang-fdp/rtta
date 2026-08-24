package com.rtta.dorriss.meeting;

import java.util.UUID;

public final class MeetingNotFoundException extends RuntimeException {

	public MeetingNotFoundException(UUID id) {
		super("Meeting not found: " + id);
	}
}

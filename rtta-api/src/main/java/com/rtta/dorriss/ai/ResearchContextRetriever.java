package com.rtta.dorriss.ai;

import java.util.List;
import java.util.UUID;

public interface ResearchContextRetriever {

	List<ResearchContextChunk> retrieve(UUID meetingId, String query, int limit);
}

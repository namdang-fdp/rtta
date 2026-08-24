package com.rtta.dorriss.summary;

record TranscriptSummaryChunk(
		int index,
		long startOffsetMs,
		long endOffsetMs,
		int utteranceCount,
		String content) {
}

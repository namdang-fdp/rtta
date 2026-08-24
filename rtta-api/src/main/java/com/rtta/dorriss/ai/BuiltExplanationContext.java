package com.rtta.dorriss.ai;

import java.util.List;
import java.util.Map;

record BuiltExplanationContext(
		Map<String, Object> snapshot,
		String userPrompt,
		List<Map<String, Object>> citations,
		int previousCount,
		int followingCount,
		int documentCount) {
}

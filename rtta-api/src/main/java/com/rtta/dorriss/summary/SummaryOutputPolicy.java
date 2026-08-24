package com.rtta.dorriss.summary;

import java.util.regex.Pattern;

import com.rtta.dorriss.ai.AiProviderException;
import org.springframework.stereotype.Component;

@Component
public class SummaryOutputPolicy {

	private static final Pattern FORBIDDEN_TASK_SECTION = Pattern.compile(
			"(?im)^#{1,6}\\s*(action items?|hành động|việc cần làm|nhiệm vụ)\\s*$");

	public String requireResearchSummary(String markdown) {
		if (markdown == null || markdown.isBlank()) {
			throw new AiProviderException("Summary response was empty");
		}
		if (FORBIDDEN_TASK_SECTION.matcher(markdown).find()) {
			throw new AiProviderException("Summary response contained a forbidden task section");
		}
		return markdown.trim();
	}
}

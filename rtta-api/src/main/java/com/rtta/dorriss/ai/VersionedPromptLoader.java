package com.rtta.dorriss.ai;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class VersionedPromptLoader {

	public String load(String resourcePath) {
		try {
			return new ClassPathResource(resourcePath).getContentAsString(StandardCharsets.UTF_8);
		}
		catch (IOException exception) {
			throw new IllegalStateException("AI prompt resource is unavailable: " + resourcePath, exception);
		}
	}
}

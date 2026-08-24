package com.rtta.dorriss.translation.azure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("rtta.translation.azure")
public record AzureSpeechTranslationProperties(String key, String region, String sdkLogFile) {

	public AzureSpeechTranslationProperties {
		key = clean(key);
		region = clean(region);
		sdkLogFile = clean(sdkLogFile);
	}

	@Override
	public String toString() {
		return "AzureSpeechTranslationProperties[key=[REDACTED], region=" + region + "]";
	}

	private static String clean(String value) {
		return value == null ? "" : value.trim();
	}
}

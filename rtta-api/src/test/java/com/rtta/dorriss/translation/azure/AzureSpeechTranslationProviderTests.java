package com.rtta.dorriss.translation.azure;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;

import com.rtta.dorriss.translation.TranslationProviderException;
import com.rtta.dorriss.translation.TranslationSessionConfig;
import org.junit.jupiter.api.Test;

class AzureSpeechTranslationProviderTests {

	@Test
	void rejectsMissingCredentialsBeforeCreatingSdkResources() {
		AzureSpeechTranslationProvider provider = new AzureSpeechTranslationProvider(
				new AzureSpeechTranslationProperties("", "koreacentral", ""),
				config());

		assertThatThrownBy(() -> provider.open(event -> { }))
				.isInstanceOf(TranslationProviderException.class)
				.hasMessageContaining("SPEECH_KEY");
	}

	@Test
	void rejectsMissingRegionBeforeCreatingSdkResources() {
		AzureSpeechTranslationProvider provider = new AzureSpeechTranslationProvider(
				new AzureSpeechTranslationProperties("placeholder", "", ""),
				config());

		assertThatThrownBy(() -> provider.open(event -> { }))
				.isInstanceOf(TranslationProviderException.class)
				.hasMessageContaining("SPEECH_REGION");
	}

	private TranslationSessionConfig config() {
		return new TranslationSessionConfig(
				16_000,
				1,
				16,
				"en-US",
				"vi",
				false,
				1.1,
				List.of(),
				Duration.ZERO);
	}
}

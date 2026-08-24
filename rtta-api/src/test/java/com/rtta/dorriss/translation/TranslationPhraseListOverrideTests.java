package com.rtta.dorriss.translation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spike.enabled=false"
})
class TranslationPhraseListOverrideTests {

	@Autowired
	private TranslationSessionConfig config;

	@Test
	void productionDefaultDisablesPhraseList() {
		assertThat(config.phraseListEnabled()).isFalse();
	}
}

package com.rtta.dorriss.translation;

import static org.assertj.core.api.Assertions.assertThat;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spike.enabled=false"
})
class TranslationPhraseListOverrideTests extends PostgresIntegrationTestSupport {

	@Autowired
	private TranslationSessionConfig config;

	@Test
	void productionDefaultDisablesPhraseList() {
		assertThat(config.phraseListEnabled()).isFalse();
	}
}

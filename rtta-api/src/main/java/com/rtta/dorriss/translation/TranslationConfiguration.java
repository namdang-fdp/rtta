package com.rtta.dorriss.translation;

import com.rtta.dorriss.translation.azure.AzureSpeechTranslationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties({
		TranslationProperties.class,
		AzureSpeechTranslationProperties.class
})
class TranslationConfiguration {

	@Bean
	TranslationSessionConfig translationSessionConfig(TranslationProperties properties) {
		return properties.toSessionConfig();
	}
}

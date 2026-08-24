package com.rtta.dorriss.translation.azure;

import java.nio.file.Path;

import com.microsoft.cognitiveservices.speech.diagnostics.logging.FileLogger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
		prefix = "rtta.translation",
		name = "provider",
		havingValue = "azure",
		matchIfMissing = true)
final class AzureSpeechSdkDiagnostics implements InitializingBean, DisposableBean {

	private static final Logger LOGGER = LoggerFactory.getLogger(AzureSpeechSdkDiagnostics.class);

	private final AzureSpeechTranslationProperties properties;

	private boolean started;

	AzureSpeechSdkDiagnostics(AzureSpeechTranslationProperties properties) {
		this.properties = properties;
	}

	@Override
	public void afterPropertiesSet() {
		if (properties.sdkLogFile().isBlank()) {
			return;
		}
		Path logFile = Path.of(properties.sdkLogFile()).toAbsolutePath().normalize();
		FileLogger.start(logFile.toString());
		started = true;
		LOGGER.info("RTTA AZURE SDK diagnosticsEnabled file={}", logFile);
	}

	@Override
	public void destroy() {
		if (!started) {
			return;
		}
		try {
			FileLogger.stop();
		}
		catch (RuntimeException exception) {
			LOGGER.warn("RTTA AZURE SDK diagnosticsStopFailed");
		}
		finally {
			started = false;
		}
	}
}

package com.rtta.dorriss.translation.azure;

import static org.mockito.Mockito.mockStatic;

import java.nio.file.Path;

import com.microsoft.cognitiveservices.speech.diagnostics.logging.FileLogger;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

class AzureSpeechSdkDiagnosticsTests {

	@Test
	void blankLogPathLeavesSdkLoggingDisabled() {
		AzureSpeechSdkDiagnostics diagnostics = new AzureSpeechSdkDiagnostics(
				new AzureSpeechTranslationProperties("placeholder", "koreacentral", ""));

		try (MockedStatic<FileLogger> fileLogger = mockStatic(FileLogger.class)) {
			diagnostics.afterPropertiesSet();
			diagnostics.destroy();
			fileLogger.verifyNoInteractions();
		}
	}

	@Test
	void configuredLogPathStartsAndStopsProcessWideSdkFileLogger() {
		String configuredPath = "./azure-speech-sdk-test.log";
		String resolvedPath = Path.of(configuredPath).toAbsolutePath().normalize().toString();
		AzureSpeechSdkDiagnostics diagnostics = new AzureSpeechSdkDiagnostics(
				new AzureSpeechTranslationProperties(
						"placeholder", "koreacentral", configuredPath));

		try (MockedStatic<FileLogger> fileLogger = mockStatic(FileLogger.class)) {
			diagnostics.afterPropertiesSet();
			diagnostics.destroy();
			fileLogger.verify(() -> FileLogger.start(resolvedPath));
			fileLogger.verify(FileLogger::stop);
			fileLogger.verifyNoMoreInteractions();
		}
	}
}

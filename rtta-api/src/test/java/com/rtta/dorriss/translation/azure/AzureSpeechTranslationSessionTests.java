package com.rtta.dorriss.translation.azure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;

import java.math.BigInteger;
import java.time.Duration;
import java.util.List;

import com.microsoft.cognitiveservices.speech.PhraseListGrammar;
import com.microsoft.cognitiveservices.speech.translation.SpeechTranslationConfig;
import com.microsoft.cognitiveservices.speech.translation.TranslationRecognizer;
import com.rtta.dorriss.translation.TranslationSessionConfig;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.MockedStatic;

class AzureSpeechTranslationSessionTests {

	@Test
	void convertsAzureHundredNanosecondTicksToMilliseconds() {
		assertThat(AzureSpeechTranslationSession.ticksToMillis(
				BigInteger.valueOf(12_345_678L))).isEqualTo(1_234);
		assertThat(AzureSpeechTranslationSession.ticksToMillis(BigInteger.ZERO)).isZero();
	}

	@Test
	void createsSpeechConfigurationWithTheKnownGoodKeyAndRegionPath() {
		AzureSpeechTranslationProperties properties =
				new AzureSpeechTranslationProperties("placeholder-key", "koreacentral", "");
		SpeechTranslationConfig expected = mock(SpeechTranslationConfig.class);

		try (MockedStatic<SpeechTranslationConfig> speechConfig =
				mockStatic(SpeechTranslationConfig.class)) {
			speechConfig.when(() -> SpeechTranslationConfig.fromSubscription(
					"placeholder-key", "koreacentral")).thenReturn(expected);

			assertThat(AzureSpeechTranslationSession.createSpeechConfig(properties))
					.isSameAs(expected);
			speechConfig.verify(() -> SpeechTranslationConfig.fromSubscription(
					"placeholder-key", "koreacentral"));
			speechConfig.verifyNoMoreInteractions();
		}
	}

	@Test
	void disabledPhraseListCreatesNoGrammarAndAppliesNoHints() {
		TranslationRecognizer recognizer = mock(TranslationRecognizer.class);

		try (MockedStatic<PhraseListGrammar> phraseListFactory =
				mockStatic(PhraseListGrammar.class)) {
			assertThat(AzureSpeechTranslationSession.configurePhraseList(
					recognizer, config(false, List.of()))).isNull();
			phraseListFactory.verifyNoInteractions();
		}
	}

	@Test
	void enabledPhraseListMatchesTheKnownGoodAddThenWeightOrder() {
		TranslationRecognizer recognizer = mock(TranslationRecognizer.class);
		PhraseListGrammar phraseList = mock(PhraseListGrammar.class);

		try (MockedStatic<PhraseListGrammar> phraseListFactory =
				mockStatic(PhraseListGrammar.class)) {
			phraseListFactory.when(() -> PhraseListGrammar.fromRecognizer(recognizer))
					.thenReturn(phraseList);

			assertThat(AzureSpeechTranslationSession.configurePhraseList(
					recognizer, config(true, List.of("pulsar", "neutron star"))))
					.isSameAs(phraseList);
			phraseListFactory.verify(() -> PhraseListGrammar.fromRecognizer(recognizer));
			InOrder order = inOrder(phraseList);
			order.verify(phraseList).addPhrase("pulsar");
			order.verify(phraseList).addPhrase("neutron star");
			order.verify(phraseList).setWeight(1.1);
			order.verifyNoMoreInteractions();
		}
	}

	private TranslationSessionConfig config(boolean phraseListEnabled, List<String> terms) {
		return new TranslationSessionConfig(
				16_000,
				1,
				16,
				"en-US",
				"vi",
				phraseListEnabled,
				1.1,
				terms,
				Duration.ZERO);
	}
}

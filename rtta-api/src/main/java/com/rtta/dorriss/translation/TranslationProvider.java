package com.rtta.dorriss.translation;

import java.util.function.Consumer;

@FunctionalInterface
public interface TranslationProvider {

	TranslationSession open(Consumer<TranslationEvent> listener);
}

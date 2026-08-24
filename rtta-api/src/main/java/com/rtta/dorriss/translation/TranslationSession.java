package com.rtta.dorriss.translation;

public interface TranslationSession extends AutoCloseable {

	void pushAudio(byte[] pcm);

	@Override
	void close();
}

package com.rtta.dorriss.ai;

import java.util.List;

interface GeminiGateway {

	String generate(AiPromptRequest request);

	List<Float> embed(String model, String text);
}

package com.rtta.dorriss.ai;

import java.util.List;

public interface ResearchAiProvider {

	AiTextResult explainConcept(AiPromptRequest request);

	AiTextResult summarizeMeeting(AiPromptRequest request);

	List<Float> embed(String text);

	List<List<Float>> embedAll(List<String> texts);
}

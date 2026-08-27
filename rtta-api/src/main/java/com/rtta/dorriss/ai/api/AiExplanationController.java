package com.rtta.dorriss.ai.api;

import java.util.List;
import java.util.UUID;

import com.rtta.dorriss.ai.ExplainConceptService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings/{meetingId}/ai")
public class AiExplanationController {

	private final ExplainConceptService explainConceptService;

	public AiExplanationController(ExplainConceptService explainConceptService) {
		this.explainConceptService = explainConceptService;
	}

	@PostMapping("/explain")
	public AiExplanationResponse explain(
			@PathVariable UUID meetingId,
			@RequestBody ExplainConceptRequest request) {
		return explainConceptService.explain(meetingId, request);
	}

	@GetMapping("/explanations")
	public List<AiExplanationResponse> listForUtterance(
			@PathVariable UUID meetingId,
			@RequestParam UUID utteranceId) {
		return explainConceptService.listForUtterance(meetingId, utteranceId);
	}
}

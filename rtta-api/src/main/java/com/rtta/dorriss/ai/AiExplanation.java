package com.rtta.dorriss.ai;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ai_explanations")
public class AiExplanation {

	@Id
	private UUID id;

	@Column(name = "meeting_id", nullable = false, updatable = false)
	private UUID meetingId;

	@Column(name = "utterance_id", updatable = false)
	private UUID utteranceId;

	@Column(name = "selected_text", nullable = false, columnDefinition = "text", updatable = false)
	private String selectedText;

	@Column(name = "user_question", columnDefinition = "text", updatable = false)
	private String userQuestion;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "context_snapshot", nullable = false, columnDefinition = "jsonb", updatable = false)
	private Map<String, Object> contextSnapshot;

	@Column(nullable = false, length = 200, updatable = false)
	private String model;

	@Column(name = "response_markdown", nullable = false, columnDefinition = "text", updatable = false)
	private String responseMarkdown;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", updatable = false)
	private List<Map<String, Object>> citations;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected AiExplanation() {
	}

	public AiExplanation(
			UUID meetingId,
			UUID utteranceId,
			String selectedText,
			String userQuestion,
			Map<String, Object> contextSnapshot,
			String model,
			String responseMarkdown,
			List<Map<String, Object>> citations,
			Instant createdAt) {
		this.id = UUID.randomUUID();
		this.meetingId = Objects.requireNonNull(meetingId, "meetingId");
		this.utteranceId = utteranceId;
		this.selectedText = requireText(selectedText, "selectedText");
		this.userQuestion = cleanOptional(userQuestion);
		this.contextSnapshot = new LinkedHashMap<>(Objects.requireNonNull(contextSnapshot, "contextSnapshot"));
		this.model = requireText(model, "model");
		this.responseMarkdown = requireText(responseMarkdown, "responseMarkdown");
		this.citations = citations == null ? null : List.copyOf(citations);
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
	}

	public UUID getId() { return id; }
	public UUID getMeetingId() { return meetingId; }
	public UUID getUtteranceId() { return utteranceId; }
	public String getSelectedText() { return selectedText; }
	public String getUserQuestion() { return userQuestion; }
	public Map<String, Object> getContextSnapshot() { return Map.copyOf(contextSnapshot); }
	public String getModel() { return model; }
	public String getResponseMarkdown() { return responseMarkdown; }
	public List<Map<String, Object>> getCitations() { return citations; }
	public Instant getCreatedAt() { return createdAt; }

	private static String requireText(String value, String name) {
		Objects.requireNonNull(value, name);
		String cleaned = value.trim();
		if (cleaned.isEmpty()) throw new IllegalArgumentException(name + " must not be blank");
		return cleaned;
	}

	private static String cleanOptional(String value) {
		if (value == null) return null;
		String cleaned = value.trim();
		return cleaned.isEmpty() ? null : cleaned;
	}
}

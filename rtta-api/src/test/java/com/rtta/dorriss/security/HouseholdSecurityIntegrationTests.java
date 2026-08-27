package com.rtta.dorriss.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import com.rtta.dorriss.PostgresIntegrationTestSupport;
import com.rtta.dorriss.ai.ExplainConceptService;
import com.rtta.dorriss.ai.api.AiExplanationResponse;
import com.rtta.dorriss.ai.api.ExplainConceptRequest;
import com.rtta.dorriss.ai.api.ExplanationDepth;
import com.rtta.dorriss.summary.MeetingSummaryService;
import com.rtta.dorriss.summary.api.MeetingSummaryResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
		"spike.enabled=false",
		"rtta.security.household-code=test-household-code"
})
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class HouseholdSecurityIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired MockMvc mvc;
	@MockitoBean ExplainConceptService explainConceptService;
	@MockitoBean MeetingSummaryService meetingSummaryService;

	@Test
	void unauthenticatedResearchIsRejected() throws Exception {
		mvc.perform(get("/api/meetings"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().string("{\"message\":\"Authentication required\"}"));
	}

	@Test
	void householdCodeCannotAuthorizeRestAsABearerCredential() throws Exception {
		mvc.perform(get("/api/meetings")
					.header("Authorization", "Bearer test-household-code"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().string("{\"message\":\"Authentication required\"}"))
				.andExpect(result -> assertThat(result.getResponse().getContentAsString())
						.doesNotContain("test-household-code"));
	}

	@Test
	void validLoginCreatesSessionAndAllowsResearch() throws Exception {
		var result = mvc.perform(post("/api/auth/login")
					.with(csrf())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"code\":\"test-household-code\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.authenticated").value(true))
				.andReturn();
		HttpSession session = result.getRequest().getSession(false);
		assertThat(session).isNotNull();

		mvc.perform(get("/api/meetings").session((MockHttpSession) session))
				.andExpect(status().isOk());
	}

	@Test
	void invalidLoginUsesGenericResponseWithoutLeakingTheCode(CapturedOutput output) throws Exception {
		mvc.perform(post("/api/auth/login")
					.with(csrf())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"code\":\"not-the-code\"}"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().json("{\"message\":\"Không thể đăng nhập.\"}"));
		assertThat(output.getAll()).doesNotContain("not-the-code");
	}

	@Test
	void authenticatedMutationWithoutCsrfIsRejected() throws Exception {
		var login = mvc.perform(post("/api/auth/login")
					.with(csrf())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"code\":\"test-household-code\"}"))
				.andReturn();
		mvc.perform(post("/api/meetings/00000000-0000-0000-0000-000000000000/recordings")
					.session((MockHttpSession) login.getRequest().getSession(false)))
				.andExpect(status().isForbidden());
	}

	@Test
	void authenticatedAiMutationsWithoutCsrfAreRejectedBeforeTheirServices() throws Exception {
		AuthenticatedSession authenticated = loginWithCurrentCsrfToken();
		UUID meetingId = UUID.randomUUID();

		mvc.perform(post("/api/meetings/{meetingId}/ai/explain", meetingId)
					.session(authenticated.session())
					.contentType(MediaType.APPLICATION_JSON)
					.content(explainRequest()))
				.andExpect(status().isForbidden());
		mvc.perform(post("/api/meetings/{meetingId}/summary", meetingId)
					.session(authenticated.session()))
				.andExpect(status().isForbidden());

		verifyNoInteractions(explainConceptService, meetingSummaryService);
	}

	@Test
	void currentSessionCsrfTokenAllowsAiMutationsPastSpringSecurity() throws Exception {
		AuthenticatedSession authenticated = loginWithCurrentCsrfToken();
		UUID meetingId = UUID.randomUUID();
		AiExplanationResponse explanation = new AiExplanationResponse(
				UUID.randomUUID(), meetingId, UUID.randomUUID(), "Hamiltonian", null,
				ExplanationDepth.QUICK, ExplanationDepth.QUICK, false, "test-model", "Explanation",
				List.of(), new AiExplanationResponse.ContextWindow(1, 1, 0), Instant.now());
		MeetingSummaryResponse summary = new MeetingSummaryResponse(
				UUID.randomUUID(), meetingId, "test-model", "Summary", Map.of(), Instant.now());
		when(explainConceptService.explain(eq(meetingId), any(ExplainConceptRequest.class)))
				.thenReturn(explanation);
		when(meetingSummaryService.generate(meetingId)).thenReturn(summary);

		mvc.perform(post("/api/meetings/{meetingId}/ai/explain", meetingId)
					.session(authenticated.session())
					.header("X-CSRF-TOKEN", authenticated.csrfToken())
					.contentType(MediaType.APPLICATION_JSON)
					.content(explainRequest()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(explanation.id().toString()));
		mvc.perform(post("/api/meetings/{meetingId}/summary", meetingId)
					.session(authenticated.session())
					.header("X-CSRF-TOKEN", authenticated.csrfToken()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(summary.id().toString()));

		verify(explainConceptService).explain(eq(meetingId), any(ExplainConceptRequest.class));
		verify(meetingSummaryService).generate(meetingId);
	}

	@Test
	void exactCredentialedCorsRejectsMismatchedOrigin() throws Exception {
		mvc.perform(get("/api/auth/me").header("Origin", "https://attacker.example"))
				.andExpect(status().isForbidden());
		mvc.perform(get("/api/auth/me").header("Origin", "http://localhost:3000"))
				.andExpect(status().isOk())
				.andExpect(result -> assertThat(result.getResponse().getHeader("Access-Control-Allow-Origin"))
						.isEqualTo("http://localhost:3000"));
	}

	private AuthenticatedSession loginWithCurrentCsrfToken() throws Exception {
		var anonymous = mvc.perform(get("/api/auth/me"))
				.andExpect(status().isOk())
				.andReturn();
		MockHttpSession session = (MockHttpSession) anonymous.getRequest().getSession(false);
		String anonymousToken = JsonPath.read(
				anonymous.getResponse().getContentAsString(), "$.csrfToken");
		mvc.perform(post("/api/auth/login")
					.session(session)
					.header("X-CSRF-TOKEN", anonymousToken)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"code\":\"test-household-code\"}"))
				.andExpect(status().isOk());
		var restored = mvc.perform(get("/api/auth/me").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.authenticated").value(true))
				.andReturn();
		String currentToken = JsonPath.read(
				restored.getResponse().getContentAsString(), "$.csrfToken");
		return new AuthenticatedSession(session, currentToken);
	}

	private String explainRequest() {
		return """
				{
				  "utteranceId": "00000000-0000-0000-0000-000000000001",
				  "selectedText": "Hamiltonian",
				  "depth": "QUICK"
				}
				""";
	}

	private record AuthenticatedSession(MockHttpSession session, String csrfToken) { }
}

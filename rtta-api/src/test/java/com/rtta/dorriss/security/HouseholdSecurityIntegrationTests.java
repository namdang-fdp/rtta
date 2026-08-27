package com.rtta.dorriss.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.junit.jupiter.api.extension.ExtendWith;

@SpringBootTest(properties = {
		"spike.enabled=false",
		"rtta.security.household-code=test-household-code",
		"rtta.security.extension-device-token=test-device-token"
})
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class HouseholdSecurityIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired MockMvc mvc;

	@Test
	void unauthenticatedResearchIsRejected() throws Exception {
		mvc.perform(get("/api/meetings"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().string("{\"message\":\"Authentication required\"}"));
	}

	@Test
	void deviceTokenCannotAuthorizeRestOrAppearInTheError() throws Exception {
		mvc.perform(get("/api/meetings")
					.header("Authorization", "Bearer test-device-token"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().string("{\"message\":\"Authentication required\"}"))
				.andExpect(result -> assertThat(result.getResponse().getContentAsString())
						.doesNotContain("test-device-token"));
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
	void exactCredentialedCorsRejectsMismatchedOrigin() throws Exception {
		mvc.perform(get("/api/auth/me").header("Origin", "https://attacker.example"))
				.andExpect(status().isForbidden());
		mvc.perform(get("/api/auth/me").header("Origin", "http://localhost:3000"))
				.andExpect(status().isOk())
				.andExpect(result -> assertThat(result.getResponse().getHeader("Access-Control-Allow-Origin"))
						.isEqualTo("http://localhost:3000"));
	}
}

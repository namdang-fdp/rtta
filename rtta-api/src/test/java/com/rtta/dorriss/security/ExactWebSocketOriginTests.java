package com.rtta.dorriss.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.util.HashMap;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.OriginHandshakeInterceptor;

class ExactWebSocketOriginTests {

	@Test
	void exactOriginAcceptsConfiguredValueAndRejectsMismatch() throws Exception {
		OriginHandshakeInterceptor interceptor = new OriginHandshakeInterceptor(
				List.of("https://temthui.dorriss.com"));
		assertThat(check(interceptor, "https://temthui.dorriss.com")).isTrue();
		assertThat(check(interceptor, "https://attacker.example")).isFalse();
		assertThat(interceptor.getAllowedOrigins()).doesNotContain("*");
	}

	private boolean check(OriginHandshakeInterceptor interceptor, String origin) throws Exception {
		MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws/live");
		servletRequest.setScheme("https");
		servletRequest.setServerName("api-rtta.dorriss.com");
		servletRequest.setServerPort(443);
		servletRequest.addHeader(HttpHeaders.ORIGIN, origin);
		return interceptor.beforeHandshake(
				new ServletServerHttpRequest(servletRequest),
				mock(ServerHttpResponse.class),
				mock(WebSocketHandler.class),
				new HashMap<>());
	}
}

package com.rtta.dorriss.security;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class HouseholdAuthController {

	private static final String FAILURE_MESSAGE = "Không thể đăng nhập.";
	private final RttaSecurityProperties properties;
	private final SecretVerifier secretVerifier;
	private final FailedLoginThrottle throttle;
	private final HttpSessionSecurityContextRepository securityContextRepository =
			new HttpSessionSecurityContextRepository();

	HouseholdAuthController(
			RttaSecurityProperties properties,
			SecretVerifier secretVerifier,
			FailedLoginThrottle throttle) {
		this.properties = properties;
		this.secretVerifier = secretVerifier;
		this.throttle = throttle;
	}

	@GetMapping("/me")
	public SessionResponse me(Authentication authentication, CsrfToken csrfToken) {
		return new SessionResponse(isHousehold(authentication), csrfToken.getToken());
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(
			@RequestBody(required = false) LoginRequest body,
			CsrfToken csrfToken,
			HttpServletRequest request,
			HttpServletResponse response) {
		String throttleKey = request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
		String supplied = body == null ? "" : body.code();
		boolean matches = secretVerifier.matches(supplied, properties.getHouseholdCode());
		if (!throttle.allow(throttleKey) || !matches) {
			throttle.failed(throttleKey);
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(new FailureResponse(FAILURE_MESSAGE));
		}

		throttle.succeeded(throttleKey);
		HttpSession existingSession = request.getSession(false);
		if (existingSession == null) request.getSession(true);
		else request.changeSessionId();
		Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
				"household", "", List.of(new SimpleGrantedAuthority("ROLE_HOUSEHOLD")));
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, request, response);
		return ResponseEntity.ok(new SessionResponse(true, csrfToken.getToken()));
	}

	@PostMapping("/logout")
	public SessionResponse logout(
			Authentication authentication,
			CsrfToken csrfToken,
			HttpServletRequest request,
			HttpServletResponse response) {
		new SecurityContextLogoutHandler().logout(request, response, authentication);
		HttpSession session = request.getSession(false);
		if (session != null) session.invalidate();
		return new SessionResponse(false, csrfToken.getToken());
	}

	private boolean isHousehold(Authentication authentication) {
		return authentication != null && authentication.isAuthenticated()
				&& "household".equals(authentication.getPrincipal());
	}

	public record LoginRequest(String code) { }
	public record SessionResponse(boolean authenticated, String csrfToken) { }
	public record FailureResponse(String message) { }
}

package com.rtta.dorriss.security;

import java.util.List;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration(proxyBeanMethods = false)
class SecurityConfiguration {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		HttpSessionCsrfTokenRepository csrf = new HttpSessionCsrfTokenRepository();
		csrf.setHeaderName("X-CSRF-TOKEN");
		http
				.cors(cors -> { })
				.csrf(configurer -> configurer.csrfTokenRepository(csrf))
				.sessionManagement(session -> session
						.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers("/health", "/error").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/auth/me").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
						.requestMatchers("/ws/audio").permitAll()
						.anyRequest().authenticated())
				.exceptionHandling(errors -> errors
						.authenticationEntryPoint((request, response, exception) -> {
							response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
							response.setContentType("application/json");
							response.getWriter().write("{\"message\":\"Authentication required\"}");
						}))
				.requestCache(cache -> cache.disable())
				.httpBasic(basic -> basic.disable())
				.formLogin(form -> form.disable())
				.logout(logout -> logout.disable());
		return http.build();
	}

	@Bean
	UrlBasedCorsConfigurationSource corsConfigurationSource(RttaSecurityProperties properties) {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(properties.webOrigins());
		configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Accept", "Content-Type", "X-CSRF-TOKEN"));
		configuration.setAllowCredentials(true);
		configuration.setMaxAge(3600L);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", configuration);
		source.registerCorsConfiguration("/health", configuration);
		return source;
	}
}

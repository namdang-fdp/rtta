package com.rtta.dorriss.audio;

import org.springframework.context.annotation.Configuration;
import com.rtta.dorriss.security.RttaSecurityProperties;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
class AudioWebSocketConfiguration implements WebSocketConfigurer {

	private final AudioWebSocketHandler audioWebSocketHandler;
	private final RttaSecurityProperties securityProperties;

	AudioWebSocketConfiguration(
			AudioWebSocketHandler audioWebSocketHandler,
			RttaSecurityProperties securityProperties) {
		this.audioWebSocketHandler = audioWebSocketHandler;
		this.securityProperties = securityProperties;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(audioWebSocketHandler, "/ws/audio")
				.setAllowedOrigins(securityProperties.extensionOrigins().toArray(String[]::new));
	}
}

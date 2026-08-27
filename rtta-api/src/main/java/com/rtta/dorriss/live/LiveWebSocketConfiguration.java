package com.rtta.dorriss.live;

import org.springframework.context.annotation.Configuration;
import com.rtta.dorriss.security.RttaSecurityProperties;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
class LiveWebSocketConfiguration implements WebSocketConfigurer {

	private final LiveWebSocketHandler liveWebSocketHandler;
	private final RttaSecurityProperties securityProperties;

	LiveWebSocketConfiguration(
			LiveWebSocketHandler liveWebSocketHandler,
			RttaSecurityProperties securityProperties) {
		this.liveWebSocketHandler = liveWebSocketHandler;
		this.securityProperties = securityProperties;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(liveWebSocketHandler, "/ws/live")
				.setAllowedOrigins(securityProperties.webOrigins().toArray(String[]::new));
	}
}

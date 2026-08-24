package com.rtta.dorriss.live;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
class LiveWebSocketConfiguration implements WebSocketConfigurer {

	private final LiveWebSocketHandler liveWebSocketHandler;

	LiveWebSocketConfiguration(LiveWebSocketHandler liveWebSocketHandler) {
		this.liveWebSocketHandler = liveWebSocketHandler;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(liveWebSocketHandler, "/ws/live")
				.setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
	}
}

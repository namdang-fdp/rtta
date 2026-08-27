package com.rtta.dorriss.audio;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
class AudioWebSocketConfiguration implements WebSocketConfigurer {

	private final AudioWebSocketHandler audioWebSocketHandler;

	AudioWebSocketConfiguration(AudioWebSocketHandler audioWebSocketHandler) {
		this.audioWebSocketHandler = audioWebSocketHandler;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(audioWebSocketHandler, "/ws/audio")
				.setAllowedOriginPatterns("chrome-extension://*");
	}
}

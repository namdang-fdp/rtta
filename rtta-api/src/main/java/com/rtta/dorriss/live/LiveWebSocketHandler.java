package com.rtta.dorriss.live;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

@Component
final class LiveWebSocketHandler extends AbstractWebSocketHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(LiveWebSocketHandler.class);

	private final LiveSessionHub liveSessionHub;

	LiveWebSocketHandler(LiveSessionHub liveSessionHub) {
		this.liveSessionHub = liveSessionHub;
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession socket) {
		liveSessionHub.subscribe(socket);
	}

	@Override
	public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
		liveSessionHub.unsubscribe(socket);
	}

	@Override
	public void handleTransportError(WebSocketSession socket, Throwable exception) {
		liveSessionHub.unsubscribe(socket);
		LOGGER.debug("RTTA LIVE transportError connection={} detail={}",
				socket.getId(), exception.getMessage());
		try {
			if (socket.isOpen()) {
				socket.close(CloseStatus.SERVER_ERROR);
			}
		}
		catch (IOException | RuntimeException closeException) {
			LOGGER.debug("Unable to close failed live connection {}", socket.getId(), closeException);
		}
	}
}

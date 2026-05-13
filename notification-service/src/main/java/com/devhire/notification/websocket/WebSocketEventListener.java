package com.devhire.notification.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Listens for WebSocket session lifecycle events (connect/disconnect) and maintains
 * a userId-to-sessionId mapping for message routing. Triggers Redis PubSub
 * subscribe/unsubscribe via the RedisPubSubBridge on session changes.
 */
@Component
public class WebSocketEventListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketEventListener.class);

    /**
     * Thread-safe mapping of userId to sessionId for active WebSocket sessions.
     * Used for message routing to determine which session belongs to which user.
     */
    private final ConcurrentHashMap<String, String> userSessionMap = new ConcurrentHashMap<>();

    private final RedisPubSubBridge redisPubSubBridge;

    public WebSocketEventListener(RedisPubSubBridge redisPubSubBridge) {
        this.redisPubSubBridge = redisPubSubBridge;
    }

    /**
     * Handles SessionConnectedEvent to register the user-session mapping and
     * subscribe the user to their Redis PubSub channel for cross-instance messaging.
     */
    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        String userId = extractUserId(accessor);

        if (userId == null || sessionId == null) {
            log.warn("SessionConnected event missing userId or sessionId, skipping registration");
            return;
        }

        userSessionMap.put(userId, sessionId);
        redisPubSubBridge.subscribeUser(userId, sessionId);

        log.info("WebSocket session connected: userId={}, sessionId={}", userId, sessionId);
    }

    /**
     * Handles SessionDisconnectEvent to clean up the user-session mapping and
     * unsubscribe the user from their Redis PubSub channel.
     */
    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        String userId = extractUserId(accessor);

        if (userId == null || sessionId == null) {
            log.warn("SessionDisconnect event missing userId or sessionId, skipping cleanup");
            return;
        }

        // Only remove the mapping if the current session matches (prevents race conditions
        // where a new session for the same user was already registered)
        userSessionMap.remove(userId, sessionId);
        redisPubSubBridge.unsubscribeUser(userId, sessionId);

        log.info("WebSocket session disconnected: userId={}, sessionId={}", userId, sessionId);
    }

    /**
     * Returns the sessionId for a given userId, if the user is currently connected.
     *
     * @param userId the user identifier
     * @return Optional containing the sessionId if the user is connected
     */
    public Optional<String> getSessionId(String userId) {
        return Optional.ofNullable(userSessionMap.get(userId));
    }

    /**
     * Returns an unmodifiable view of the current user-session mappings.
     * Useful for diagnostics and cross-instance session queries.
     *
     * @return unmodifiable map of userId to sessionId
     */
    public Map<String, String> getActiveUserSessions() {
        return Map.copyOf(userSessionMap);
    }

    /**
     * Returns the number of currently connected users.
     *
     * @return count of active user sessions
     */
    public int getConnectedUserCount() {
        return userSessionMap.size();
    }

    /**
     * Extracts the userId from session attributes that were set by the WebSocketAuthInterceptor
     * during the STOMP CONNECT handshake.
     */
    private String extractUserId(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }
        Object userId = sessionAttributes.get(WebSocketAuthInterceptor.SESSION_ATTR_USER_ID);
        return userId != null ? userId.toString() : null;
    }
}

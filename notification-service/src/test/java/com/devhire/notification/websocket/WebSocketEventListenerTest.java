package com.devhire.notification.websocket;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WebSocketEventListenerTest {

    private RedisPubSubBridge redisPubSubBridge;
    private WebSocketEventListener listener;

    @BeforeEach
    void setUp() {
        redisPubSubBridge = mock(RedisPubSubBridge.class);
        listener = new WebSocketEventListener(redisPubSubBridge);
    }

    @Test
    void handleSessionConnected_registersUserSessionMapping() {
        SessionConnectedEvent event = createConnectedEvent("user-123", "session-abc");

        listener.handleSessionConnected(event);

        assertThat(listener.getSessionId("user-123")).contains("session-abc");
        assertThat(listener.getConnectedUserCount()).isEqualTo(1);
    }

    @Test
    void handleSessionConnected_callsRedisPubSubSubscribe() {
        SessionConnectedEvent event = createConnectedEvent("user-456", "session-def");

        listener.handleSessionConnected(event);

        verify(redisPubSubBridge).subscribeUser("user-456", "session-def");
    }

    @Test
    void handleSessionDisconnect_removesUserSessionMapping() {
        SessionConnectedEvent connectEvent = createConnectedEvent("user-789", "session-ghi");
        listener.handleSessionConnected(connectEvent);

        SessionDisconnectEvent disconnectEvent = createDisconnectEvent("user-789", "session-ghi");
        listener.handleSessionDisconnect(disconnectEvent);

        assertThat(listener.getSessionId("user-789")).isEmpty();
        assertThat(listener.getConnectedUserCount()).isEqualTo(0);
    }

    @Test
    void handleSessionDisconnect_callsRedisPubSubUnsubscribe() {
        SessionConnectedEvent connectEvent = createConnectedEvent("user-101", "session-jkl");
        listener.handleSessionConnected(connectEvent);

        SessionDisconnectEvent disconnectEvent = createDisconnectEvent("user-101", "session-jkl");
        listener.handleSessionDisconnect(disconnectEvent);

        verify(redisPubSubBridge).unsubscribeUser("user-101", "session-jkl");
    }

    @Test
    void handleSessionDisconnect_doesNotRemoveMappingIfSessionIdMismatch() {
        // Simulate a new session being registered before the old one disconnects
        SessionConnectedEvent connectEvent1 = createConnectedEvent("user-202", "session-old");
        listener.handleSessionConnected(connectEvent1);

        // New session replaces old one
        SessionConnectedEvent connectEvent2 = createConnectedEvent("user-202", "session-new");
        listener.handleSessionConnected(connectEvent2);

        // Old session disconnects - should NOT remove the new mapping
        SessionDisconnectEvent disconnectEvent = createDisconnectEvent("user-202", "session-old");
        listener.handleSessionDisconnect(disconnectEvent);

        assertThat(listener.getSessionId("user-202")).contains("session-new");
    }

    @Test
    void handleSessionConnected_skipsRegistrationWhenUserIdMissing() {
        SessionConnectedEvent event = createConnectedEventWithoutUserId("session-xyz");

        listener.handleSessionConnected(event);

        assertThat(listener.getConnectedUserCount()).isEqualTo(0);
        verifyNoInteractions(redisPubSubBridge);
    }

    @Test
    void handleSessionDisconnect_skipsCleanupWhenUserIdMissing() {
        SessionDisconnectEvent event = createDisconnectEventWithoutUserId("session-xyz");

        listener.handleSessionDisconnect(event);

        verifyNoInteractions(redisPubSubBridge);
    }

    @Test
    void getActiveUserSessions_returnsAllConnectedUsers() {
        listener.handleSessionConnected(createConnectedEvent("user-a", "session-1"));
        listener.handleSessionConnected(createConnectedEvent("user-b", "session-2"));
        listener.handleSessionConnected(createConnectedEvent("user-c", "session-3"));

        Map<String, String> sessions = listener.getActiveUserSessions();

        assertThat(sessions).hasSize(3);
        assertThat(sessions).containsEntry("user-a", "session-1");
        assertThat(sessions).containsEntry("user-b", "session-2");
        assertThat(sessions).containsEntry("user-c", "session-3");
    }

    @Test
    void getActiveUserSessions_returnsDefensiveCopy() {
        listener.handleSessionConnected(createConnectedEvent("user-x", "session-x"));

        Map<String, String> sessions = listener.getActiveUserSessions();

        // Verify it's an unmodifiable copy
        org.junit.jupiter.api.Assertions.assertThrows(
                UnsupportedOperationException.class,
                () -> sessions.put("hacker", "session")
        );
    }

    // --- Helper methods ---

    private SessionConnectedEvent createConnectedEvent(String userId, String sessionId) {
        Message<byte[]> message = createMessageWithSessionAttributes(userId, sessionId);
        return new SessionConnectedEvent(this, message);
    }

    private SessionDisconnectEvent createDisconnectEvent(String userId, String sessionId) {
        Message<byte[]> message = createMessageWithSessionAttributes(userId, sessionId);
        return new SessionDisconnectEvent(this, message, sessionId, null);
    }

    private SessionConnectedEvent createConnectedEventWithoutUserId(String sessionId) {
        Message<byte[]> message = createMessageWithoutUserId(sessionId);
        return new SessionConnectedEvent(this, message);
    }

    private SessionDisconnectEvent createDisconnectEventWithoutUserId(String sessionId) {
        Message<byte[]> message = createMessageWithoutUserId(sessionId);
        return new SessionDisconnectEvent(this, message, sessionId, null);
    }

    private Message<byte[]> createMessageWithSessionAttributes(String userId, String sessionId) {
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put(WebSocketAuthInterceptor.SESSION_ATTR_USER_ID, userId);
        sessionAttributes.put(WebSocketAuthInterceptor.SESSION_ATTR_EMAIL, "test@example.com");
        sessionAttributes.put(WebSocketAuthInterceptor.SESSION_ATTR_ROLE, "CANDIDATE");

        Map<String, Object> headers = new HashMap<>();
        headers.put(SimpMessageHeaderAccessor.SESSION_ID_HEADER, sessionId);
        headers.put(SimpMessageHeaderAccessor.SESSION_ATTRIBUTES, sessionAttributes);

        return new GenericMessage<>(new byte[0], new MessageHeaders(headers));
    }

    private Message<byte[]> createMessageWithoutUserId(String sessionId) {
        Map<String, Object> sessionAttributes = new HashMap<>();

        Map<String, Object> headers = new HashMap<>();
        headers.put(SimpMessageHeaderAccessor.SESSION_ID_HEADER, sessionId);
        headers.put(SimpMessageHeaderAccessor.SESSION_ATTRIBUTES, sessionAttributes);

        return new GenericMessage<>(new byte[0], new MessageHeaders(headers));
    }
}

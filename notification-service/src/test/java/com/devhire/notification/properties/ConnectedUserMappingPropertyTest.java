package com.devhire.notification.properties;

import com.devhire.notification.websocket.RedisPubSubBridge;
import com.devhire.notification.websocket.WebSocketEventListener;
import net.jqwik.api.*;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Property-based test for Connected User Mapping Invariant.
 *
 * <p>Feature: realtime-collaboration, Property 4: Connected User Mapping Invariant</p>
 *
 * <p><b>Validates: Requirements 3.2, 3.4</b></p>
 *
 * <p>For any sequence of connect/disconnect events, the mapping exactly equals
 * the set of currently connected users.</p>
 */
@Label("Feature: realtime-collaboration, Property 4: Connected User Mapping Invariant")
@Tag("realtime-collaboration")
@Tag("property-test")
class ConnectedUserMappingPropertyTest {

    /**
     * Represents a connect or disconnect event in the sequence.
     */
    sealed interface SessionEvent permits ConnectEvent, DisconnectEvent {}

    record ConnectEvent(String userId, String sessionId) implements SessionEvent {}
    record DisconnectEvent(String userId, String sessionId) implements SessionEvent {}

    /**
     * Property 4: For any sequence of connect/disconnect events processed by the
     * WebSocket gateway, the set of userId-to-session mappings SHALL exactly equal
     * the set of currently connected users (every connected user has an entry,
     * no disconnected user has an entry).
     */
    @Property(tries = 200)
    void mappingEqualsSetOfCurrentlyConnectedUsers(
            @ForAll("eventSequences") List<SessionEvent> events
    ) {
        RedisPubSubBridge bridge = mock(RedisPubSubBridge.class);
        WebSocketEventListener listener = new WebSocketEventListener(bridge);

        // Track expected state: userId -> latest sessionId (null if disconnected)
        Map<String, String> expectedConnections = new HashMap<>();

        for (SessionEvent event : events) {
            switch (event) {
                case ConnectEvent connect -> {
                    listener.handleSessionConnected(createConnectedEvent(connect.userId(), connect.sessionId()));
                    expectedConnections.put(connect.userId(), connect.sessionId());
                }
                case DisconnectEvent disconnect -> {
                    listener.handleSessionDisconnect(createDisconnectEvent(disconnect.userId(), disconnect.sessionId()));
                    // Only remove if the session matches (same logic as the implementation)
                    String currentSession = expectedConnections.get(disconnect.userId());
                    if (currentSession != null && currentSession.equals(disconnect.sessionId())) {
                        expectedConnections.remove(disconnect.userId());
                    }
                }
            }
        }

        // Verify: the mapping exactly equals the expected set of connected users
        Map<String, String> actualSessions = listener.getActiveUserSessions();
        assertThat(actualSessions).isEqualTo(expectedConnections);
        assertThat(listener.getConnectedUserCount()).isEqualTo(expectedConnections.size());
    }

    @Provide
    Arbitrary<List<SessionEvent>> eventSequences() {
        // Generate a pool of user IDs and session IDs
        Arbitrary<String> userIds = Arbitraries.strings()
                .ofMinLength(3).ofMaxLength(12)
                .alpha().numeric()
                .map(s -> "user-" + s);

        Arbitrary<String> sessionIds = Arbitraries.strings()
                .ofMinLength(3).ofMaxLength(12)
                .alpha().numeric()
                .map(s -> "session-" + s);

        Arbitrary<SessionEvent> connectEvents = Combinators.combine(userIds, sessionIds)
                .as(ConnectEvent::new);

        Arbitrary<SessionEvent> disconnectEvents = Combinators.combine(userIds, sessionIds)
                .as(DisconnectEvent::new);

        return Arbitraries.oneOf(connectEvents, disconnectEvents)
                .list()
                .ofMinSize(1)
                .ofMaxSize(50);
    }

    // --- Helper methods ---

    private SessionConnectedEvent createConnectedEvent(String userId, String sessionId) {
        Message<byte[]> message = createMessage(userId, sessionId);
        return new SessionConnectedEvent(this, message);
    }

    private SessionDisconnectEvent createDisconnectEvent(String userId, String sessionId) {
        Message<byte[]> message = createMessage(userId, sessionId);
        return new SessionDisconnectEvent(this, message, sessionId, null);
    }

    private Message<byte[]> createMessage(String userId, String sessionId) {
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("userId", userId);
        sessionAttributes.put("email", "test@example.com");
        sessionAttributes.put("role", "CANDIDATE");

        Map<String, Object> headers = new HashMap<>();
        headers.put(SimpMessageHeaderAccessor.SESSION_ID_HEADER, sessionId);
        headers.put(SimpMessageHeaderAccessor.SESSION_ATTRIBUTES, sessionAttributes);

        return new GenericMessage<>(new byte[0], new MessageHeaders(headers));
    }
}

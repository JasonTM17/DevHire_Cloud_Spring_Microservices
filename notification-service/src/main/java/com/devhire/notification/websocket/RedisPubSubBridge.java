package com.devhire.notification.websocket;

import com.devhire.notification.dto.WebSocketMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages Redis PubSub subscriptions per connected user and forwards messages
 * to local STOMP sessions. Enables cross-instance message delivery by subscribing
 * to user-specific Redis channels (user:{userId}) and relaying received messages
 * to the appropriate local WebSocket sessions via SimpMessagingTemplate.
 *
 * <p>Requirements: 3.1, 3.2, 3.3, 3.5</p>
 */
@Component
public class RedisPubSubBridge {

    private static final Logger log = LoggerFactory.getLogger(RedisPubSubBridge.class);
    private static final String CHANNEL_PREFIX = "user:";

    private final RedisMessageListenerContainer listenerContainer;
    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Maps userId to the set of sessionIds currently subscribed on this instance.
     * A user may have multiple sessions (e.g., multiple browser tabs).
     */
    private final Map<String, Set<String>> userSessions = new ConcurrentHashMap<>();

    /**
     * Maps userId to the active Redis MessageListener for that user's channel.
     * Used to unsubscribe when the last session for a user disconnects.
     */
    private final Map<String, MessageListener> userListeners = new ConcurrentHashMap<>();

    public RedisPubSubBridge(
            RedisMessageListenerContainer listenerContainer,
            StringRedisTemplate redisTemplate,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper) {
        this.listenerContainer = listenerContainer;
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Subscribes to the Redis PubSub channel for the given user. If this is the first
     * session for the user on this instance, a new Redis subscription is created.
     * Additional sessions for the same user share the existing subscription.
     *
     * @param userId    the user identifier to subscribe for
     * @param sessionId the WebSocket session identifier
     */
    public void subscribeUser(String userId, String sessionId) {
        userSessions.compute(userId, (key, sessions) -> {
            if (sessions == null) {
                sessions = ConcurrentHashMap.newKeySet();
            }
            sessions.add(sessionId);
            return sessions;
        });

        // Only create a Redis subscription if this is the first session for this user
        userListeners.computeIfAbsent(userId, uid -> {
            MessageListener listener = createMessageListener(uid);
            ChannelTopic topic = new ChannelTopic(CHANNEL_PREFIX + uid);
            listenerContainer.addMessageListener(listener, topic);
            log.info("Subscribed to Redis PubSub channel: {} for sessionId: {}", topic.getTopic(), sessionId);
            return listener;
        });

        log.debug("User {} session {} registered. Active sessions: {}",
                userId, sessionId, userSessions.get(userId).size());
    }

    /**
     * Unsubscribes a session from the Redis PubSub channel for the given user.
     * If this was the last session for the user on this instance, the Redis
     * subscription is removed. Designed to complete within 5 seconds of disconnect.
     *
     * @param userId    the user identifier to unsubscribe
     * @param sessionId the WebSocket session identifier being disconnected
     */
    @Async
    public void unsubscribeUser(String userId, String sessionId) {
        Set<String> sessions = userSessions.get(userId);
        if (sessions == null) {
            log.debug("No sessions found for user {} during unsubscribe", userId);
            return;
        }

        sessions.remove(sessionId);
        log.debug("User {} session {} removed. Remaining sessions: {}", userId, sessionId, sessions.size());

        // If no more sessions for this user, remove the Redis subscription
        if (sessions.isEmpty()) {
            userSessions.remove(userId);
            MessageListener listener = userListeners.remove(userId);
            if (listener != null) {
                ChannelTopic topic = new ChannelTopic(CHANNEL_PREFIX + userId);
                listenerContainer.removeMessageListener(listener, topic);
                log.info("Unsubscribed from Redis PubSub channel: {} (last session {} disconnected)",
                        topic.getTopic(), sessionId);
            }
        }
    }

    /**
     * Publishes a message to the user-specific Redis PubSub channel.
     * All notification-service instances subscribed to this channel will receive
     * the message and forward it to local STOMP sessions for the target user.
     *
     * @param userId  the target user identifier
     * @param message the WebSocket message to publish
     */
    public void publishToUser(String userId, WebSocketMessage message) {
        String channel = CHANNEL_PREFIX + userId;
        try {
            String serialized = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(channel, serialized);
            log.debug("Published message to Redis channel {}: type={}", channel, message.type());
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize WebSocketMessage for user {}: {}", userId, ex.getMessage(), ex);
        }
    }

    /**
     * Creates a MessageListener that deserializes incoming Redis PubSub messages
     * and forwards them to the appropriate STOMP destination for the user.
     */
    private MessageListener createMessageListener(String userId) {
        return (message, pattern) -> {
            try {
                String body = new String(message.getBody());
                WebSocketMessage wsMessage = objectMapper.readValue(body, WebSocketMessage.class);

                String destination = wsMessage.destination();
                if (destination == null || destination.isBlank()) {
                    // Default to user-specific notification destination
                    destination = "/user/" + userId + "/notifications";
                }

                messagingTemplate.convertAndSend(destination, wsMessage.payload());
                log.debug("Forwarded PubSub message to STOMP destination {} for user {}",
                        destination, userId);
            } catch (JsonProcessingException ex) {
                log.error("Failed to deserialize PubSub message for user {}: {}",
                        userId, ex.getMessage(), ex);
            } catch (Exception ex) {
                log.error("Error forwarding PubSub message to STOMP for user {}: {}",
                        userId, ex.getMessage(), ex);
            }
        };
    }

    /**
     * Returns the number of active sessions for a given user on this instance.
     * Useful for diagnostics and testing.
     */
    public int getActiveSessionCount(String userId) {
        Set<String> sessions = userSessions.get(userId);
        return sessions == null ? 0 : sessions.size();
    }

    /**
     * Returns whether a user has any active sessions on this instance.
     */
    public boolean isUserSubscribed(String userId) {
        return userListeners.containsKey(userId);
    }
}

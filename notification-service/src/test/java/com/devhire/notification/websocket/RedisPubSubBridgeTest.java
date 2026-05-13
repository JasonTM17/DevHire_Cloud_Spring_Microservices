package com.devhire.notification.websocket;

import com.devhire.notification.dto.WebSocketMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RedisPubSubBridgeTest {

    private RedisMessageListenerContainer listenerContainer;
    private StringRedisTemplate redisTemplate;
    private SimpMessagingTemplate messagingTemplate;
    private ObjectMapper objectMapper;
    private RedisPubSubBridge bridge;

    @BeforeEach
    void setUp() {
        listenerContainer = mock(RedisMessageListenerContainer.class);
        redisTemplate = mock(StringRedisTemplate.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        objectMapper = new ObjectMapper();
        bridge = new RedisPubSubBridge(listenerContainer, redisTemplate, messagingTemplate, objectMapper);
    }

    @Test
    void subscribeUser_createsRedisSubscriptionForFirstSession() {
        bridge.subscribeUser("user-1", "session-a");

        verify(listenerContainer).addMessageListener(any(MessageListener.class), eq(new ChannelTopic("user:user-1")));
        assertThat(bridge.getActiveSessionCount("user-1")).isEqualTo(1);
        assertThat(bridge.isUserSubscribed("user-1")).isTrue();
    }

    @Test
    void subscribeUser_doesNotDuplicateRedisSubscriptionForSameUser() {
        bridge.subscribeUser("user-1", "session-a");
        bridge.subscribeUser("user-1", "session-b");

        // Only one Redis subscription should be created
        verify(listenerContainer, times(1)).addMessageListener(any(MessageListener.class), eq(new ChannelTopic("user:user-1")));
        assertThat(bridge.getActiveSessionCount("user-1")).isEqualTo(2);
    }

    @Test
    void subscribeUser_createsIndependentSubscriptionsForDifferentUsers() {
        bridge.subscribeUser("user-1", "session-a");
        bridge.subscribeUser("user-2", "session-b");

        verify(listenerContainer).addMessageListener(any(MessageListener.class), eq(new ChannelTopic("user:user-1")));
        verify(listenerContainer).addMessageListener(any(MessageListener.class), eq(new ChannelTopic("user:user-2")));
        assertThat(bridge.isUserSubscribed("user-1")).isTrue();
        assertThat(bridge.isUserSubscribed("user-2")).isTrue();
    }

    @Test
    void unsubscribeUser_removesSessionButKeepsSubscriptionIfOtherSessionsExist() {
        bridge.subscribeUser("user-1", "session-a");
        bridge.subscribeUser("user-1", "session-b");

        bridge.unsubscribeUser("user-1", "session-a");

        assertThat(bridge.getActiveSessionCount("user-1")).isEqualTo(1);
        assertThat(bridge.isUserSubscribed("user-1")).isTrue();
        verify(listenerContainer, never()).removeMessageListener(any(), any(ChannelTopic.class));
    }

    @Test
    void unsubscribeUser_removesRedisSubscriptionWhenLastSessionDisconnects() {
        bridge.subscribeUser("user-1", "session-a");

        bridge.unsubscribeUser("user-1", "session-a");

        verify(listenerContainer).removeMessageListener(any(MessageListener.class), eq(new ChannelTopic("user:user-1")));
        assertThat(bridge.getActiveSessionCount("user-1")).isEqualTo(0);
        assertThat(bridge.isUserSubscribed("user-1")).isFalse();
    }

    @Test
    void unsubscribeUser_handlesUnknownUserGracefully() {
        // Should not throw
        bridge.unsubscribeUser("unknown-user", "session-x");

        verifyNoInteractions(listenerContainer);
    }

    @Test
    void publishToUser_sendsSerializedMessageToRedisChannel() throws JsonProcessingException {
        WebSocketMessage message = new WebSocketMessage(
                "NOTIFICATION",
                "/user/user-1/notifications",
                "{\"id\":\"123\",\"title\":\"Test\"}"
        );

        bridge.publishToUser("user-1", message);

        String expectedSerialized = objectMapper.writeValueAsString(message);
        verify(redisTemplate).convertAndSend("user:user-1", expectedSerialized);
    }

    @Test
    void publishToUser_handlesMultipleMessagesToSameUser() throws JsonProcessingException {
        WebSocketMessage msg1 = new WebSocketMessage("NOTIFICATION", "/user/u1/notifications", "{\"id\":\"1\"}");
        WebSocketMessage msg2 = new WebSocketMessage("NOTIFICATION", "/user/u1/notifications", "{\"id\":\"2\"}");

        bridge.publishToUser("u1", msg1);
        bridge.publishToUser("u1", msg2);

        verify(redisTemplate, times(2)).convertAndSend(eq("user:u1"), anyString());
    }

    @Test
    void messageListener_forwardsReceivedMessageToStompDestination() throws JsonProcessingException {
        // Subscribe to capture the listener
        ArgumentCaptor<MessageListener> listenerCaptor = ArgumentCaptor.forClass(MessageListener.class);
        bridge.subscribeUser("user-1", "session-a");
        verify(listenerContainer).addMessageListener(listenerCaptor.capture(), any(ChannelTopic.class));

        MessageListener listener = listenerCaptor.getValue();

        // Simulate receiving a message from Redis PubSub
        WebSocketMessage wsMessage = new WebSocketMessage(
                "NOTIFICATION",
                "/user/user-1/notifications",
                "{\"id\":\"notif-1\",\"title\":\"Hello\"}"
        );
        String serialized = objectMapper.writeValueAsString(wsMessage);
        org.springframework.data.redis.connection.Message redisMessage =
                new org.springframework.data.redis.connection.DefaultMessage(
                        "user:user-1".getBytes(), serialized.getBytes());

        listener.onMessage(redisMessage, null);

        verify(messagingTemplate).convertAndSend("/user/user-1/notifications", "{\"id\":\"notif-1\",\"title\":\"Hello\"}");
    }

    @Test
    void messageListener_usesDefaultDestinationWhenNoneProvided() throws JsonProcessingException {
        ArgumentCaptor<MessageListener> listenerCaptor = ArgumentCaptor.forClass(MessageListener.class);
        bridge.subscribeUser("user-2", "session-b");
        verify(listenerContainer).addMessageListener(listenerCaptor.capture(), any(ChannelTopic.class));

        MessageListener listener = listenerCaptor.getValue();

        // Message with null destination
        WebSocketMessage wsMessage = new WebSocketMessage("NOTIFICATION", null, "{\"id\":\"notif-2\"}");
        String serialized = objectMapper.writeValueAsString(wsMessage);
        org.springframework.data.redis.connection.Message redisMessage =
                new org.springframework.data.redis.connection.DefaultMessage(
                        "user:user-2".getBytes(), serialized.getBytes());

        listener.onMessage(redisMessage, null);

        verify(messagingTemplate).convertAndSend("/user/user-2/notifications", "{\"id\":\"notif-2\"}");
    }

    @Test
    void messageListener_handlesInvalidJsonGracefully() {
        ArgumentCaptor<MessageListener> listenerCaptor = ArgumentCaptor.forClass(MessageListener.class);
        bridge.subscribeUser("user-3", "session-c");
        verify(listenerContainer).addMessageListener(listenerCaptor.capture(), any(ChannelTopic.class));

        MessageListener listener = listenerCaptor.getValue();

        // Invalid JSON - should not throw
        org.springframework.data.redis.connection.Message redisMessage =
                new org.springframework.data.redis.connection.DefaultMessage(
                        "user:user-3".getBytes(), "not-valid-json".getBytes());

        listener.onMessage(redisMessage, null);

        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void getActiveSessionCount_returnsZeroForUnknownUser() {
        assertThat(bridge.getActiveSessionCount("unknown")).isEqualTo(0);
    }

    @Test
    void isUserSubscribed_returnsFalseForUnknownUser() {
        assertThat(bridge.isUserSubscribed("unknown")).isFalse();
    }
}

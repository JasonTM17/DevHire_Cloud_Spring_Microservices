package com.devhire.notification.integration;

import com.devhire.notification.dto.WebSocketMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for Redis PubSub fan-out across simulated notification-service instances.
 * Verifies that messages published to a user channel are received by all subscribed instances.
 *
 * <p>Validates: Requirements 3.1, 3.2, 3.3</p>
 */
@Tag("integration")
@Testcontainers(disabledWithoutDocker = true)
class RedisPubSubFanOutIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7.4-alpine"))
            .withExposedPorts(6379);

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        connectionFactory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory.afterPropertiesSet();

        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();

        objectMapper = new ObjectMapper();
    }

    /**
     * Requirement 3.1: WHEN a notification is created for a user, THE Notification_Service SHALL
     * publish the message to Redis_PubSub on the channel corresponding to the target userId.
     *
     * Requirement 3.2: THE WebSocket_Gateway SHALL subscribe to Redis_PubSub channels for all
     * currently connected users on that instance.
     *
     * Requirement 3.3: WHEN a message is received from Redis_PubSub, THE WebSocket_Gateway SHALL
     * forward the message to the local WebSocket session for the target user.
     */
    @Test
    void publishToUser_messageReceivedByAllSubscribedInstances() throws Exception {
        String userId = "user-fanout-1";
        String channel = "user:" + userId;

        // Simulate two notification-service instances subscribing to the same user channel
        CountDownLatch latch = new CountDownLatch(2);
        CopyOnWriteArrayList<String> instance1Messages = new CopyOnWriteArrayList<>();
        CopyOnWriteArrayList<String> instance2Messages = new CopyOnWriteArrayList<>();

        RedisMessageListenerContainer container1 = createListenerContainer();
        RedisMessageListenerContainer container2 = createListenerContainer();

        MessageListener listener1 = (message, pattern) -> {
            instance1Messages.add(new String(message.getBody()));
            latch.countDown();
        };
        MessageListener listener2 = (message, pattern) -> {
            instance2Messages.add(new String(message.getBody()));
            latch.countDown();
        };

        container1.addMessageListener(listener1, new ChannelTopic(channel));
        container2.addMessageListener(listener2, new ChannelTopic(channel));

        // Allow subscriptions to register
        Thread.sleep(500);

        // Publish a message to the user channel (simulating notification creation)
        WebSocketMessage wsMessage = new WebSocketMessage(
                "NOTIFICATION",
                "/user/" + userId + "/notifications",
                "{\"id\":\"n1\",\"title\":\"New Application\"}"
        );
        String serialized = objectMapper.writeValueAsString(wsMessage);
        redisTemplate.convertAndSend(channel, serialized);

        // Both instances should receive the message
        boolean received = latch.await(5, TimeUnit.SECONDS);
        assertThat(received).isTrue();
        assertThat(instance1Messages).hasSize(1);
        assertThat(instance2Messages).hasSize(1);
        assertThat(instance1Messages.get(0)).isEqualTo(serialized);
        assertThat(instance2Messages.get(0)).isEqualTo(serialized);

        container1.stop();
        container2.stop();
    }

    /**
     * Requirement 3.2: Multiple users can be subscribed simultaneously on the same instance.
     */
    @Test
    void multipleUsers_eachReceivesOnlyTheirMessages() throws Exception {
        String userA = "user-a";
        String userB = "user-b";
        String channelA = "user:" + userA;
        String channelB = "user:" + userB;

        CountDownLatch latchA = new CountDownLatch(1);
        CountDownLatch latchB = new CountDownLatch(1);
        CopyOnWriteArrayList<String> messagesA = new CopyOnWriteArrayList<>();
        CopyOnWriteArrayList<String> messagesB = new CopyOnWriteArrayList<>();

        RedisMessageListenerContainer container = createListenerContainer();

        container.addMessageListener((message, pattern) -> {
            messagesA.add(new String(message.getBody()));
            latchA.countDown();
        }, new ChannelTopic(channelA));

        container.addMessageListener((message, pattern) -> {
            messagesB.add(new String(message.getBody()));
            latchB.countDown();
        }, new ChannelTopic(channelB));

        Thread.sleep(500);

        // Publish to user A's channel
        redisTemplate.convertAndSend(channelA, "message-for-A");
        // Publish to user B's channel
        redisTemplate.convertAndSend(channelB, "message-for-B");

        assertThat(latchA.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(latchB.await(5, TimeUnit.SECONDS)).isTrue();

        assertThat(messagesA).containsExactly("message-for-A");
        assertThat(messagesB).containsExactly("message-for-B");

        container.stop();
    }

    /**
     * Requirement 3.3: Messages are delivered with correct content (no corruption during fan-out).
     */
    @Test
    void publishToUser_messageContentPreservedAcrossInstances() throws Exception {
        String userId = "user-content-check";
        String channel = "user:" + userId;

        CountDownLatch latch = new CountDownLatch(3);
        CopyOnWriteArrayList<String> receivedMessages = new CopyOnWriteArrayList<>();

        // Simulate 3 instances
        RedisMessageListenerContainer container1 = createListenerContainer();
        RedisMessageListenerContainer container2 = createListenerContainer();
        RedisMessageListenerContainer container3 = createListenerContainer();

        MessageListener listener = (message, pattern) -> {
            receivedMessages.add(new String(message.getBody()));
            latch.countDown();
        };

        container1.addMessageListener(listener, new ChannelTopic(channel));
        container2.addMessageListener(listener, new ChannelTopic(channel));
        container3.addMessageListener(listener, new ChannelTopic(channel));

        Thread.sleep(500);

        WebSocketMessage wsMessage = new WebSocketMessage(
                "ASSESSMENT_PROGRESS",
                "/topic/assessment/assess-1/status",
                "{\"testCaseIndex\":3,\"totalTestCases\":10,\"status\":\"passed\"}"
        );
        String serialized = objectMapper.writeValueAsString(wsMessage);
        redisTemplate.convertAndSend(channel, serialized);

        assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(receivedMessages).hasSize(3);

        // All instances received the exact same message
        for (String received : receivedMessages) {
            WebSocketMessage deserialized = objectMapper.readValue(received, WebSocketMessage.class);
            assertThat(deserialized.type()).isEqualTo("ASSESSMENT_PROGRESS");
            assertThat(deserialized.destination()).isEqualTo("/topic/assessment/assess-1/status");
            assertThat(deserialized.payload()).contains("testCaseIndex");
        }

        container1.stop();
        container2.stop();
        container3.stop();
    }

    /**
     * Requirement 3.1: Unsubscribed instances do not receive messages.
     */
    @Test
    void unsubscribedInstance_doesNotReceiveMessages() throws Exception {
        String userId = "user-unsub";
        String channel = "user:" + userId;

        CountDownLatch subscribedLatch = new CountDownLatch(1);
        CopyOnWriteArrayList<String> subscribedMessages = new CopyOnWriteArrayList<>();
        CopyOnWriteArrayList<String> unsubscribedMessages = new CopyOnWriteArrayList<>();

        RedisMessageListenerContainer subscribedContainer = createListenerContainer();
        RedisMessageListenerContainer unsubscribedContainer = createListenerContainer();

        MessageListener subscribedListener = (message, pattern) -> {
            subscribedMessages.add(new String(message.getBody()));
            subscribedLatch.countDown();
        };
        MessageListener unsubscribedListener = (message, pattern) -> {
            unsubscribedMessages.add(new String(message.getBody()));
        };

        subscribedContainer.addMessageListener(subscribedListener, new ChannelTopic(channel));
        unsubscribedContainer.addMessageListener(unsubscribedListener, new ChannelTopic(channel));

        Thread.sleep(500);

        // Unsubscribe the second instance before publishing
        unsubscribedContainer.removeMessageListener(unsubscribedListener, new ChannelTopic(channel));
        Thread.sleep(200);

        redisTemplate.convertAndSend(channel, "after-unsubscribe");

        assertThat(subscribedLatch.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(subscribedMessages).hasSize(1);

        // Give some time to ensure unsubscribed instance doesn't receive
        Thread.sleep(500);
        assertThat(unsubscribedMessages).isEmpty();

        subscribedContainer.stop();
        unsubscribedContainer.stop();
    }

    /**
     * Requirement 3.1: Multiple messages are delivered in order to all subscribers.
     */
    @Test
    void multipleMessages_deliveredInOrderToAllSubscribers() throws Exception {
        String userId = "user-order";
        String channel = "user:" + userId;
        int messageCount = 5;

        CountDownLatch latch = new CountDownLatch(messageCount * 2); // 2 instances
        CopyOnWriteArrayList<String> instance1Messages = new CopyOnWriteArrayList<>();
        CopyOnWriteArrayList<String> instance2Messages = new CopyOnWriteArrayList<>();

        RedisMessageListenerContainer container1 = createListenerContainer();
        RedisMessageListenerContainer container2 = createListenerContainer();

        container1.addMessageListener((message, pattern) -> {
            instance1Messages.add(new String(message.getBody()));
            latch.countDown();
        }, new ChannelTopic(channel));

        container2.addMessageListener((message, pattern) -> {
            instance2Messages.add(new String(message.getBody()));
            latch.countDown();
        }, new ChannelTopic(channel));

        Thread.sleep(500);

        // Publish multiple messages
        for (int i = 0; i < messageCount; i++) {
            redisTemplate.convertAndSend(channel, "msg-" + i);
        }

        assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        assertThat(instance1Messages).hasSize(messageCount);
        assertThat(instance2Messages).hasSize(messageCount);

        // Verify ordering is preserved
        for (int i = 0; i < messageCount; i++) {
            assertThat(instance1Messages.get(i)).isEqualTo("msg-" + i);
            assertThat(instance2Messages.get(i)).isEqualTo("msg-" + i);
        }

        container1.stop();
        container2.stop();
    }

    private RedisMessageListenerContainer createListenerContainer() {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.setTaskExecutor(Runnable::run);
        container.afterPropertiesSet();
        container.start();
        return container;
    }
}

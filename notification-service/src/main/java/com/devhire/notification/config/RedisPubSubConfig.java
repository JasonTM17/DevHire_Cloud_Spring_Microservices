package com.devhire.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Configures the Redis PubSub infrastructure for cross-instance WebSocket message delivery.
 * Provides a RedisMessageListenerContainer that the RedisPubSubBridge uses to dynamically
 * subscribe/unsubscribe to user-specific channels.
 */
@Configuration
@EnableAsync
public class RedisPubSubConfig {

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}

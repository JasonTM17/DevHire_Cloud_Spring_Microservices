package com.devhire.notification.presence;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PresenceTrackerTest {

    private StringRedisTemplate redisTemplate;
    private SimpMessagingTemplate messagingTemplate;
    private ObjectMapper objectMapper;
    private ValueOperations<String, String> valueOperations;
    private ZSetOperations<String, String> zSetOperations;
    private PresenceTracker presenceTracker;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        objectMapper = new ObjectMapper();
        valueOperations = mock(ValueOperations.class);
        zSetOperations = mock(ZSetOperations.class);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);

        presenceTracker = new PresenceTracker(redisTemplate, messagingTemplate, objectMapper);
    }

    @Test
    void markOnline_setsRedisKeyWithTtl90Seconds() {
        presenceTracker.markOnline("user-1", "job:123");

        verify(valueOperations).set(
                eq("presence:user:user-1"),
                argThat(value -> value.contains("\"context\":\"job:123\"") && value.contains("\"connectedAt\"")),
                eq(Duration.ofSeconds(90))
        );
    }

    @Test
    void markOnline_publishesPresenceChangeToStompTopic() {
        presenceTracker.markOnline("user-1", "job:123");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), payloadCaptor.capture());

        String payload = payloadCaptor.getValue();
        assertThat(payload).contains("\"userId\":\"user-1\"");
        assertThat(payload).contains("\"status\":\"online\"");
        assertThat(payload).contains("\"context\":\"job:123\"");
    }

    @Test
    void markOffline_deletesRedisKey() {
        presenceTracker.markOffline("user-1");

        verify(redisTemplate).delete("presence:user:user-1");
    }

    @Test
    void markOffline_publishesOfflinePresenceChange() {
        presenceTracker.markOffline("user-1");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), payloadCaptor.capture());

        String payload = payloadCaptor.getValue();
        assertThat(payload).contains("\"userId\":\"user-1\"");
        assertThat(payload).contains("\"status\":\"offline\"");
    }

    @Test
    void refreshHeartbeat_resetsTtlOnPresenceKey() {
        when(redisTemplate.expire("presence:user:user-1", Duration.ofSeconds(90))).thenReturn(true);

        presenceTracker.refreshHeartbeat("user-1");

        verify(redisTemplate).expire("presence:user:user-1", Duration.ofSeconds(90));
    }

    @Test
    void refreshHeartbeat_handlesNonExistentKeyGracefully() {
        when(redisTemplate.expire("presence:user:user-1", Duration.ofSeconds(90))).thenReturn(false);

        // Should not throw
        presenceTracker.refreshHeartbeat("user-1");

        verify(redisTemplate).expire("presence:user:user-1", Duration.ofSeconds(90));
    }

    @Test
    void getOnlineUsers_returnsUsersMatchingContext() {
        Set<String> keys = new LinkedHashSet<>();
        keys.add("presence:user:user-1");
        keys.add("presence:user:user-2");
        keys.add("presence:user:user-3");

        when(redisTemplate.keys("presence:user:*")).thenReturn(keys);
        when(valueOperations.get("presence:user:user-1"))
                .thenReturn("{\"context\":\"job:123\",\"connectedAt\":\"2024-01-01T00:00:00Z\"}");
        when(valueOperations.get("presence:user:user-2"))
                .thenReturn("{\"context\":\"job:456\",\"connectedAt\":\"2024-01-01T00:00:00Z\"}");
        when(valueOperations.get("presence:user:user-3"))
                .thenReturn("{\"context\":\"job:123\",\"connectedAt\":\"2024-01-01T00:00:00Z\"}");

        Set<String> result = presenceTracker.getOnlineUsers("job:123");

        assertThat(result).containsExactlyInAnyOrder("user-1", "user-3");
    }

    @Test
    void getOnlineUsers_returnsEmptySetWhenNoKeysExist() {
        when(redisTemplate.keys("presence:user:*")).thenReturn(null);

        Set<String> result = presenceTracker.getOnlineUsers("job:123");

        assertThat(result).isEmpty();
    }

    @Test
    void getOnlineUsers_handlesExpiredKeysGracefully() {
        Set<String> keys = Set.of("presence:user:user-1");
        when(redisTemplate.keys("presence:user:*")).thenReturn(keys);
        when(valueOperations.get("presence:user:user-1")).thenReturn(null);

        Set<String> result = presenceTracker.getOnlineUsers("job:123");

        assertThat(result).isEmpty();
    }

    @Test
    void getViewerCount_returnsCardinalityOfSortedSet() {
        when(zSetOperations.zCard("viewers:job:job-1")).thenReturn(5L);

        int count = presenceTracker.getViewerCount("job-1");

        assertThat(count).isEqualTo(5);
    }

    @Test
    void getViewerCount_returnsZeroWhenKeyDoesNotExist() {
        when(zSetOperations.zCard("viewers:job:job-1")).thenReturn(null);

        int count = presenceTracker.getViewerCount("job-1");

        assertThat(count).isEqualTo(0);
    }

    @Test
    void addViewer_addsUserToSortedSetWithTimestampScore() {
        presenceTracker.addViewer("user-1", "job-1");

        verify(zSetOperations).add(eq("viewers:job:job-1"), eq("user-1"), anyDouble());
    }

    @Test
    void removeViewer_removesUserFromSortedSet() {
        presenceTracker.removeViewer("user-1", "job-1");

        verify(zSetOperations).remove("viewers:job:job-1", "user-1");
    }

    @Test
    void getViewers_returnsAllMembersOfSortedSet() {
        @SuppressWarnings("unchecked")
        ZSetOperations.TypedTuple<String> tuple1 = mock(ZSetOperations.TypedTuple.class);
        @SuppressWarnings("unchecked")
        ZSetOperations.TypedTuple<String> tuple2 = mock(ZSetOperations.TypedTuple.class);

        when(tuple1.getValue()).thenReturn("user-1");
        when(tuple2.getValue()).thenReturn("user-2");

        Set<ZSetOperations.TypedTuple<String>> tuples = new LinkedHashSet<>();
        tuples.add(tuple1);
        tuples.add(tuple2);

        when(zSetOperations.rangeWithScores("viewers:job:job-1", 0, -1)).thenReturn(tuples);

        Set<String> viewers = presenceTracker.getViewers("job-1");

        assertThat(viewers).containsExactlyInAnyOrder("user-1", "user-2");
    }

    @Test
    void getViewers_returnsEmptySetWhenNoViewers() {
        when(zSetOperations.rangeWithScores("viewers:job:job-1", 0, -1)).thenReturn(null);

        Set<String> viewers = presenceTracker.getViewers("job-1");

        assertThat(viewers).isEmpty();
    }
}

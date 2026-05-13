package com.devhire.notification.controller;

import com.devhire.notification.presence.PresenceTracker;
import com.devhire.notification.presence.ViewerCountPublisher;
import com.devhire.notification.websocket.WebSocketSessionCache;
import com.devhire.notification.websocket.WebSocketSessionMetadata;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ViewerControllerTest {

    private PresenceTracker presenceTracker;
    private ViewerCountPublisher viewerCountPublisher;
    private WebSocketSessionCache webSocketSessionCache;
    private ViewerController viewerController;

    @BeforeEach
    void setUp() {
        presenceTracker = mock(PresenceTracker.class);
        viewerCountPublisher = mock(ViewerCountPublisher.class);
        webSocketSessionCache = mock(WebSocketSessionCache.class);
        viewerController = new ViewerController(presenceTracker, viewerCountPublisher, webSocketSessionCache);
    }

    @Test
    void getOnlineUserCount_returnsCountAndUsers() {
        when(presenceTracker.getOnlineUsers("job:123")).thenReturn(Set.of("user-1", "user-2"));

        var response = viewerController.getOnlineUserCount("job:123");

        assertThat(response.success()).isTrue();
        assertThat(response.data().get("context")).isEqualTo("job:123");
        assertThat(response.data().get("count")).isEqualTo(2);
        @SuppressWarnings("unchecked")
        Set<String> users = (Set<String>) response.data().get("users");
        assertThat(users).containsExactlyInAnyOrder("user-1", "user-2");
    }

    @Test
    void getOnlineUserCount_returnsZeroWhenNoUsers() {
        when(presenceTracker.getOnlineUsers("job:999")).thenReturn(Set.of());

        var response = viewerController.getOnlineUserCount("job:999");

        assertThat(response.success()).isTrue();
        assertThat(response.data().get("count")).isEqualTo(0);
    }

    @Test
    void getJobViewerCount_returnsCountAndViewers() {
        when(presenceTracker.getViewerCount("job-1")).thenReturn(3);
        when(presenceTracker.getViewers("job-1")).thenReturn(Set.of("user-1", "user-2", "user-3"));

        var response = viewerController.getJobViewerCount("job-1");

        assertThat(response.success()).isTrue();
        assertThat(response.data().get("jobId")).isEqualTo("job-1");
        assertThat(response.data().get("count")).isEqualTo(3);
    }

    @Test
    void isCandidateActiveOnAssessment_returnsTrueWhenSubscribed() {
        String candidateId = "candidate-1";
        String assessmentId = "assessment-1";
        String assessmentTopic = "/topic/assessment/assessment-1/status";

        WebSocketSessionMetadata session = new WebSocketSessionMetadata(
                "session-1", candidateId, Instant.now(),
                List.of(assessmentTopic, "/user/candidate-1/notifications"),
                "instance-1"
        );

        when(webSocketSessionCache.getSessionsByUser(candidateId)).thenReturn(List.of(session));

        var response = viewerController.isCandidateActiveOnAssessment(assessmentId, candidateId);

        assertThat(response.success()).isTrue();
        assertThat(response.data().get("isActive")).isEqualTo(true);
    }

    @Test
    void isCandidateActiveOnAssessment_returnsFalseWhenNotSubscribed() {
        String candidateId = "candidate-1";
        String assessmentId = "assessment-1";

        WebSocketSessionMetadata session = new WebSocketSessionMetadata(
                "session-1", candidateId, Instant.now(),
                List.of("/user/candidate-1/notifications"),
                "instance-1"
        );

        when(webSocketSessionCache.getSessionsByUser(candidateId)).thenReturn(List.of(session));

        var response = viewerController.isCandidateActiveOnAssessment(assessmentId, candidateId);

        assertThat(response.success()).isTrue();
        assertThat(response.data().get("isActive")).isEqualTo(false);
    }

    @Test
    void isCandidateActiveOnAssessment_returnsFalseWhenNoSessions() {
        when(webSocketSessionCache.getSessionsByUser("candidate-1")).thenReturn(List.of());

        var response = viewerController.isCandidateActiveOnAssessment("assessment-1", "candidate-1");

        assertThat(response.success()).isTrue();
        assertThat(response.data().get("isActive")).isEqualTo(false);
    }

    @Test
    void subscribeToJobViewers_addsViewerAndSchedulesUpdate() {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.create();
        Map<String, Object> sessionAttrs = new HashMap<>();
        sessionAttrs.put("userId", "user-1");
        headerAccessor.setSessionAttributes(sessionAttrs);

        viewerController.subscribeToJobViewers("job-1", headerAccessor);

        verify(presenceTracker).addViewer("user-1", "job-1");
        verify(viewerCountPublisher).scheduleUpdate("job-1");
    }

    @Test
    void subscribeToJobViewers_doesNothingWhenNoUserId() {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.create();
        headerAccessor.setSessionAttributes(new HashMap<>());

        viewerController.subscribeToJobViewers("job-1", headerAccessor);

        verify(presenceTracker, never()).addViewer(anyString(), anyString());
        verify(viewerCountPublisher, never()).scheduleUpdate(anyString());
    }

    @Test
    void unsubscribeFromJobViewers_removesViewerAndSchedulesUpdate() {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.create();
        Map<String, Object> sessionAttrs = new HashMap<>();
        sessionAttrs.put("userId", "user-1");
        headerAccessor.setSessionAttributes(sessionAttrs);

        viewerController.unsubscribeFromJobViewers("job-1", headerAccessor);

        verify(presenceTracker).removeViewer("user-1", "job-1");
        verify(viewerCountPublisher).scheduleUpdate("job-1");
    }

    @Test
    void unsubscribeFromJobViewers_doesNothingWhenNoUserId() {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.create();
        headerAccessor.setSessionAttributes(new HashMap<>());

        viewerController.unsubscribeFromJobViewers("job-1", headerAccessor);

        verify(presenceTracker, never()).removeViewer(anyString(), anyString());
        verify(viewerCountPublisher, never()).scheduleUpdate(anyString());
    }

    @Test
    void isCandidateTakingAssessment_checksCorrectTopic() {
        String candidateId = "candidate-1";
        String assessmentId = "assess-xyz";
        String expectedTopic = "/topic/assessment/assess-xyz/status";

        WebSocketSessionMetadata session = new WebSocketSessionMetadata(
                "session-1", candidateId, Instant.now(),
                List.of(expectedTopic),
                "instance-1"
        );

        when(webSocketSessionCache.getSessionsByUser(candidateId)).thenReturn(List.of(session));

        boolean result = viewerController.isCandidateTakingAssessment(candidateId, assessmentId);

        assertThat(result).isTrue();
    }

    @Test
    void isCandidateTakingAssessment_returnsFalseForDifferentAssessment() {
        String candidateId = "candidate-1";

        WebSocketSessionMetadata session = new WebSocketSessionMetadata(
                "session-1", candidateId, Instant.now(),
                List.of("/topic/assessment/other-assessment/status"),
                "instance-1"
        );

        when(webSocketSessionCache.getSessionsByUser(candidateId)).thenReturn(List.of(session));

        boolean result = viewerController.isCandidateTakingAssessment(candidateId, "assess-xyz");

        assertThat(result).isFalse();
    }
}

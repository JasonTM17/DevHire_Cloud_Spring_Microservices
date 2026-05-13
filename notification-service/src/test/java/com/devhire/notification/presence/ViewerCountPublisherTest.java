package com.devhire.notification.presence;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ViewerCountPublisherTest {

    private PresenceTracker presenceTracker;
    private SimpMessagingTemplate messagingTemplate;
    private ObjectMapper objectMapper;
    private ViewerCountPublisher viewerCountPublisher;

    @BeforeEach
    void setUp() {
        presenceTracker = mock(PresenceTracker.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        objectMapper = new ObjectMapper();
        viewerCountPublisher = new ViewerCountPublisher(presenceTracker, messagingTemplate, objectMapper);
    }

    @Test
    void scheduleUpdate_addsPendingUpdate() {
        viewerCountPublisher.scheduleUpdate("job-1");

        assertThat(viewerCountPublisher.getPendingUpdates()).contains("job-1");
    }

    @Test
    void flushPendingUpdates_publishesViewerCountToStompTopic() {
        when(presenceTracker.getViewerCount("job-1")).thenReturn(5);

        viewerCountPublisher.scheduleUpdate("job-1");
        viewerCountPublisher.flushPendingUpdates();

        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(destinationCaptor.capture(), payloadCaptor.capture());

        assertThat(destinationCaptor.getValue()).isEqualTo("/topic/job/job-1/viewers");
        String payload = (String) payloadCaptor.getValue();
        assertThat(payload).contains("\"contextId\":\"job-1\"");
        assertThat(payload).contains("\"count\":5");
    }

    @Test
    void flushPendingUpdates_removesPendingUpdateAfterPublish() {
        when(presenceTracker.getViewerCount("job-1")).thenReturn(3);

        viewerCountPublisher.scheduleUpdate("job-1");
        viewerCountPublisher.flushPendingUpdates();

        assertThat(viewerCountPublisher.getPendingUpdates()).doesNotContain("job-1");
    }

    @Test
    void flushPendingUpdates_respectsDebounceInterval() {
        when(presenceTracker.getViewerCount("job-1")).thenReturn(3);

        // First flush should publish
        viewerCountPublisher.scheduleUpdate("job-1");
        viewerCountPublisher.flushPendingUpdates();

        // Schedule another update immediately
        viewerCountPublisher.scheduleUpdate("job-1");
        viewerCountPublisher.flushPendingUpdates();

        // Should only have published once because debounce interval hasn't passed
        verify(messagingTemplate, times(1)).convertAndSend(anyString(), anyString());
    }

    @Test
    void flushPendingUpdates_doesNothingWhenNoPendingUpdates() {
        viewerCountPublisher.flushPendingUpdates();

        verifyNoInteractions(messagingTemplate);
        verifyNoInteractions(presenceTracker);
    }

    @Test
    void flushPendingUpdates_handlesMultipleJobsIndependently() {
        when(presenceTracker.getViewerCount("job-1")).thenReturn(2);
        when(presenceTracker.getViewerCount("job-2")).thenReturn(7);

        viewerCountPublisher.scheduleUpdate("job-1");
        viewerCountPublisher.scheduleUpdate("job-2");
        viewerCountPublisher.flushPendingUpdates();

        verify(messagingTemplate).convertAndSend(eq("/topic/job/job-1/viewers"), anyString());
        verify(messagingTemplate).convertAndSend(eq("/topic/job/job-2/viewers"), anyString());
    }

    @Test
    void getLastPublishTime_returnsNullBeforeFirstPublish() {
        assertThat(viewerCountPublisher.getLastPublishTime("job-1")).isNull();
    }

    @Test
    void getLastPublishTime_returnsTimestampAfterPublish() {
        when(presenceTracker.getViewerCount("job-1")).thenReturn(1);

        viewerCountPublisher.scheduleUpdate("job-1");
        viewerCountPublisher.flushPendingUpdates();

        assertThat(viewerCountPublisher.getLastPublishTime("job-1")).isNotNull();
    }
}

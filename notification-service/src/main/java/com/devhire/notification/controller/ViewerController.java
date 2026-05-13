package com.devhire.notification.controller;

import com.devhire.common.ApiResponse;
import com.devhire.notification.presence.PresenceTracker;
import com.devhire.notification.presence.ViewerCountPublisher;
import com.devhire.notification.websocket.WebSocketSessionCache;
import com.devhire.notification.websocket.WebSocketSessionMetadata;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Handles contextual viewing indicators including viewer tracking per job,
 * subscribe/unsubscribe for viewer topics, and assessment activity indicators.
 *
 * <p>Requirements: 9.1, 9.2, 9.3, 9.4, 9.5</p>
 */
@RestController
public class ViewerController {

    private static final Logger log = LoggerFactory.getLogger(ViewerController.class);

    private static final String ASSESSMENT_TOPIC_PREFIX = "/topic/assessment/";
    private static final String ASSESSMENT_TOPIC_SUFFIX = "/status";

    private final PresenceTracker presenceTracker;
    private final ViewerCountPublisher viewerCountPublisher;
    private final WebSocketSessionCache webSocketSessionCache;

    public ViewerController(
            PresenceTracker presenceTracker,
            ViewerCountPublisher viewerCountPublisher,
            WebSocketSessionCache webSocketSessionCache) {
        this.presenceTracker = presenceTracker;
        this.viewerCountPublisher = viewerCountPublisher;
        this.webSocketSessionCache = webSocketSessionCache;
    }

    /**
     * REST endpoint returning the online user count for a given context (e.g., "job:123").
     * Requirement 8.5: Expose REST endpoint for online user count per context.
     *
     * @param context the context identifier (e.g., "job:123" or "assessment:456")
     * @return the count and list of online users for the context
     */
    @GetMapping("/viewers/{context}/count")
    public ApiResponse<Map<String, Object>> getOnlineUserCount(@PathVariable String context) {
        Set<String> onlineUsers = presenceTracker.getOnlineUsers(context);
        int viewerCount = onlineUsers.size();

        Map<String, Object> result = Map.of(
                "context", context,
                "count", viewerCount,
                "users", onlineUsers
        );

        return ApiResponse.ok(result);
    }

    /**
     * REST endpoint returning the viewer count for a specific job using the Redis sorted set.
     *
     * @param jobId the job identifier
     * @return the viewer count and viewer list for the job
     */
    @GetMapping("/viewers/job/{jobId}/count")
    public ApiResponse<Map<String, Object>> getJobViewerCount(@PathVariable String jobId) {
        int count = presenceTracker.getViewerCount(jobId);
        Set<String> viewers = presenceTracker.getViewers(jobId);

        Map<String, Object> result = Map.of(
                "jobId", jobId,
                "count", count,
                "viewers", viewers
        );

        return ApiResponse.ok(result);
    }

    /**
     * REST endpoint for the "Candidate is currently taking assessment" indicator.
     * Returns true if the candidate has an active WebSocket session subscribed to
     * an assessment status topic.
     * Requirement 9.4.
     *
     * @param assessmentId the assessment identifier
     * @param candidateId  the candidate user identifier
     * @return indicator showing whether the candidate is actively taking the assessment
     */
    @GetMapping("/viewers/assessment/{assessmentId}/candidate/{candidateId}/active")
    public ApiResponse<Map<String, Object>> isCandidateActiveOnAssessment(
            @PathVariable String assessmentId,
            @PathVariable String candidateId) {

        boolean isActive = isCandidateTakingAssessment(candidateId, assessmentId);

        Map<String, Object> result = Map.of(
                "candidateId", candidateId,
                "assessmentId", assessmentId,
                "isActive", isActive
        );

        return ApiResponse.ok(result);
    }

    /**
     * STOMP message handler for subscribing to a job's viewer topic.
     * When a user sends a message to /app/job/{jobId}/viewers/subscribe,
     * they are added as a viewer for that job.
     * Requirements: 9.1, 9.2.
     */
    @MessageMapping("/job/{jobId}/viewers/subscribe")
    public void subscribeToJobViewers(
            @DestinationVariable String jobId,
            SimpMessageHeaderAccessor headerAccessor) {

        String userId = extractUserId(headerAccessor);
        if (userId == null) {
            log.warn("Cannot subscribe to job viewers: userId not found in session");
            return;
        }

        presenceTracker.addViewer(userId, jobId);
        viewerCountPublisher.scheduleUpdate(jobId);

        log.info("User {} subscribed to viewers for job {}", userId, jobId);
    }

    /**
     * STOMP message handler for unsubscribing from a job's viewer topic.
     * When a user sends a message to /app/job/{jobId}/viewers/unsubscribe,
     * they are removed as a viewer for that job.
     * Requirement 9.3.
     */
    @MessageMapping("/job/{jobId}/viewers/unsubscribe")
    public void unsubscribeFromJobViewers(
            @DestinationVariable String jobId,
            SimpMessageHeaderAccessor headerAccessor) {

        String userId = extractUserId(headerAccessor);
        if (userId == null) {
            log.warn("Cannot unsubscribe from job viewers: userId not found in session");
            return;
        }

        presenceTracker.removeViewer(userId, jobId);
        viewerCountPublisher.scheduleUpdate(jobId);

        log.info("User {} unsubscribed from viewers for job {}", userId, jobId);
    }

    /**
     * Checks if a candidate is currently taking an assessment by verifying they have
     * an active WebSocket session subscribed to the assessment status topic.
     * Requirement 9.4: indicator is true iff candidate has active WebSocket session
     * with assessment subscription.
     *
     * @param candidateId  the candidate's user ID
     * @param assessmentId the assessment ID
     * @return true if the candidate has an active session with an assessment subscription
     */
    boolean isCandidateTakingAssessment(String candidateId, String assessmentId) {
        String assessmentTopic = ASSESSMENT_TOPIC_PREFIX + assessmentId + ASSESSMENT_TOPIC_SUFFIX;

        List<WebSocketSessionMetadata> candidateSessions =
                webSocketSessionCache.getSessionsByUser(candidateId);

        return candidateSessions.stream()
                .anyMatch(session -> session.subscriptions().contains(assessmentTopic));
    }

    /**
     * Extracts the userId from the STOMP session attributes set by WebSocketAuthInterceptor.
     */
    private String extractUserId(SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }
        Object userId = sessionAttributes.get("userId");
        return userId != null ? userId.toString() : null;
    }
}

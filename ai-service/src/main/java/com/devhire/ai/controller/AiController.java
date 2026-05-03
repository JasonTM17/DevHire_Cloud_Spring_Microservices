package com.devhire.ai.controller;

import com.devhire.ai.dto.AiChatRequest;
import com.devhire.ai.dto.AiChatResponse;
import com.devhire.ai.dto.AiConversationSummary;
import com.devhire.ai.dto.AiMessageResponse;
import com.devhire.ai.dto.AiStreamEvent;
import com.devhire.ai.service.AiAssistantService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ai")
public class AiController {
    private final AiAssistantService aiAssistantService;

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/chat")
    public ApiResponse<AiChatResponse> chat(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                            @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                            @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                            @Valid @RequestBody AiChatRequest request) {
        return ApiResponse.ok(aiAssistantService.chat(new AuthenticatedUser(userId, email, role), request));
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<AiStreamEvent>> stream(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                       @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                       @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                       @Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiAssistantService.chat(new AuthenticatedUser(userId, email, role), request);
        List<String> chunks = chunkAnswer(response.answer());
        Flux<ServerSentEvent<AiStreamEvent>> body = Flux.fromIterable(chunks)
                .delayElements(Duration.ofMillis(15))
                .map(chunk -> event("delta", new AiStreamEvent("delta", chunk)));
        return Flux.concat(
                Flux.just(event("metadata", new AiStreamEvent("metadata", response))),
                body,
                Flux.just(event("done", new AiStreamEvent("done", response.conversationId())))
        );
    }

    @GetMapping("/conversations")
    public ApiResponse<List<AiConversationSummary>> conversations(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(aiAssistantService.listConversations(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/conversations/{id}")
    public ApiResponse<List<AiMessageResponse>> messages(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                         @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                         @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                         @PathVariable UUID id) {
        return ApiResponse.ok(aiAssistantService.messages(new AuthenticatedUser(userId, email, role), id));
    }

    @DeleteMapping("/conversations/{id}")
    public ApiResponse<Void> delete(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                    @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                    @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                    @PathVariable UUID id) {
        aiAssistantService.deleteConversation(new AuthenticatedUser(userId, email, role), id);
        return ApiResponse.ok(null);
    }

    private static ServerSentEvent<AiStreamEvent> event(String name, AiStreamEvent event) {
        return ServerSentEvent.builder(event).event(name).build();
    }

    private static List<String> chunkAnswer(String answer) {
        return java.util.Arrays.stream(answer.split("(?<=\\n)|(?<=\\. )"))
                .filter(part -> !part.isBlank())
                .toList();
    }
}

package com.devhire.notification.client;

import com.devhire.common.ApiResponse;
import com.devhire.notification.client.dto.ProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "user-service", url = "${user-service.url:http://localhost:8082}")
public interface UserClient {
    @GetMapping("/users/{id}")
    ApiResponse<ProfileResponse> getProfile(@PathVariable UUID id);
}

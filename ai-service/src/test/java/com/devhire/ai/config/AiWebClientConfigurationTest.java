package com.devhire.ai.config;

import com.devhire.ai.client.AnthropicClaudeClient;
import com.devhire.ai.tool.JobSearchTool;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.webclient.autoconfigure.WebClientAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.web.reactive.function.client.WebClient;

import static org.assertj.core.api.Assertions.assertThat;

class AiWebClientConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(WebClientAutoConfiguration.class))
            .withBean(AiProperties.class, AiProperties::new)
            .withUserConfiguration(ClientConfiguration.class);

    @Test
    void autoConfiguresWebClientBuilderForAiClients() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(WebClient.Builder.class);
            assertThat(context).hasSingleBean(AnthropicClaudeClient.class);
            assertThat(context).hasSingleBean(JobSearchTool.class);
        });
    }

    @Configuration(proxyBeanMethods = false)
    @Import({AnthropicClaudeClient.class, JobSearchTool.class})
    static class ClientConfiguration {
    }
}

package com.devhire.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "devhire.ai")
public class AiProperties {
    private boolean demoFallbackEnabled = true;
    private int maxContextChunks = 5;
    private String jobServiceUrl = "http://localhost:8084";
    private int providerFailureThreshold = 3;
    private int providerCircuitOpenSeconds = 120;
    private Anthropic anthropic = new Anthropic();

    public boolean isDemoFallbackEnabled() {
        return demoFallbackEnabled;
    }

    public void setDemoFallbackEnabled(boolean demoFallbackEnabled) {
        this.demoFallbackEnabled = demoFallbackEnabled;
    }

    public int getMaxContextChunks() {
        return maxContextChunks;
    }

    public void setMaxContextChunks(int maxContextChunks) {
        this.maxContextChunks = maxContextChunks;
    }

    public String getJobServiceUrl() {
        return jobServiceUrl;
    }

    public void setJobServiceUrl(String jobServiceUrl) {
        this.jobServiceUrl = jobServiceUrl;
    }

    public int getProviderFailureThreshold() {
        return providerFailureThreshold;
    }

    public void setProviderFailureThreshold(int providerFailureThreshold) {
        this.providerFailureThreshold = providerFailureThreshold;
    }

    public int getProviderCircuitOpenSeconds() {
        return providerCircuitOpenSeconds;
    }

    public void setProviderCircuitOpenSeconds(int providerCircuitOpenSeconds) {
        this.providerCircuitOpenSeconds = providerCircuitOpenSeconds;
    }

    public Anthropic getAnthropic() {
        return anthropic;
    }

    public void setAnthropic(Anthropic anthropic) {
        this.anthropic = anthropic;
    }

    public static class Anthropic {
        private String apiKey = "";
        private String baseUrl = "https://api.anthropic.com";
        private String model = "claude-haiku-4-5-20251001";
        private int maxTokens = 900;
        private String version = "2023-06-01";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public int getMaxTokens() {
            return maxTokens;
        }

        public void setMaxTokens(int maxTokens) {
            this.maxTokens = maxTokens;
        }

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }
    }
}

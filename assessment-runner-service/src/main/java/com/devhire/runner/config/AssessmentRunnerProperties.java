package com.devhire.runner.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@ConfigurationProperties(prefix = "devhire.assessment-runner")
public class AssessmentRunnerProperties {
    private String mode = "deterministic";
    private String judge0BaseUrl = "";
    private String judge0AuthToken = "";
    private boolean networkDisabled = true;
    private int defaultTimeLimitMs = 2_000;
    private int defaultMemoryKb = 131_072;
    private int maxOutputBytes = 12_000;
    private int connectTimeoutMs = 2_000;
    private int readTimeoutMs = 10_000;
    private int pollIntervalMs = 250;
    private int pollMaxAttempts = 20;
    private int javaLanguageId = 62;
    private int typescriptLanguageId = 74;
    private int sqlLanguageId = 82;
    private String runnerVersion = "devhire-runtime-v0.7";

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = normalize(mode, "deterministic");
    }

    public String getJudge0BaseUrl() {
        return judge0BaseUrl;
    }

    public void setJudge0BaseUrl(String judge0BaseUrl) {
        this.judge0BaseUrl = judge0BaseUrl == null ? "" : judge0BaseUrl.trim();
    }

    public String getJudge0AuthToken() {
        return judge0AuthToken;
    }

    public void setJudge0AuthToken(String judge0AuthToken) {
        this.judge0AuthToken = judge0AuthToken == null ? "" : judge0AuthToken.trim();
    }

    public boolean isNetworkDisabled() {
        return networkDisabled;
    }

    public void setNetworkDisabled(boolean networkDisabled) {
        this.networkDisabled = networkDisabled;
    }

    public int getDefaultTimeLimitMs() {
        return defaultTimeLimitMs;
    }

    public void setDefaultTimeLimitMs(int defaultTimeLimitMs) {
        this.defaultTimeLimitMs = Math.max(250, defaultTimeLimitMs);
    }

    public int getDefaultMemoryKb() {
        return defaultMemoryKb;
    }

    public void setDefaultMemoryKb(int defaultMemoryKb) {
        this.defaultMemoryKb = Math.max(16_384, defaultMemoryKb);
    }

    public int getMaxOutputBytes() {
        return maxOutputBytes;
    }

    public void setMaxOutputBytes(int maxOutputBytes) {
        this.maxOutputBytes = Math.max(1_024, maxOutputBytes);
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = Math.max(250, connectTimeoutMs);
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = Math.max(1_000, readTimeoutMs);
    }

    public int getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(int pollIntervalMs) {
        this.pollIntervalMs = Math.max(50, pollIntervalMs);
    }

    public int getPollMaxAttempts() {
        return pollMaxAttempts;
    }

    public void setPollMaxAttempts(int pollMaxAttempts) {
        this.pollMaxAttempts = Math.max(1, pollMaxAttempts);
    }

    public int getJavaLanguageId() {
        return javaLanguageId;
    }

    public void setJavaLanguageId(int javaLanguageId) {
        this.javaLanguageId = javaLanguageId;
    }

    public int getTypescriptLanguageId() {
        return typescriptLanguageId;
    }

    public void setTypescriptLanguageId(int typescriptLanguageId) {
        this.typescriptLanguageId = typescriptLanguageId;
    }

    public int getSqlLanguageId() {
        return sqlLanguageId;
    }

    public void setSqlLanguageId(int sqlLanguageId) {
        this.sqlLanguageId = sqlLanguageId;
    }

    public String getRunnerVersion() {
        return runnerVersion;
    }

    public void setRunnerVersion(String runnerVersion) {
        this.runnerVersion = runnerVersion == null || runnerVersion.isBlank()
                ? "devhire-runtime-v0.7"
                : runnerVersion.trim();
    }

    private static String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toLowerCase(Locale.ROOT);
    }
}

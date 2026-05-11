package com.devhire.runner.service;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.regex.Pattern;

final class SandboxPolicy {
    private static final Pattern FORBIDDEN_BOUNDARY = Pattern.compile(
            "(?i)((^|\\s)package\\s+[a-z0-9_.]+\\s*;|public\\s+class\\s+candidatesolution|"
                    + "runtime\\s*\\.\\s*getruntime|processbuilder|system\\s*\\.\\s*exit|\\.\\s*exec\\s*\\(|"
                    + "socket\\s*\\(|files\\s*\\.\\s*(read|readstring|readallbytes|write)|java\\.nio\\.file|"
                    + "new\\s+file\\s*\\(|fileinputstream|fileoutputstream|java\\.io|java\\.net|httpclient|"
                    + "java\\.lang\\.reflect|getdeclaredmethod|getmethod\\s*\\(|method\\s*\\.\\s*invoke|classloader|"
                    + "httpurlconnection|new\\s+url\\s*\\(|uri\\s*\\.\\s*create|fetch\\s*\\(|xmlhttprequest|"
                    + "child_process|deno\\s*\\.\\s*(read|write|run)|bun\\s*\\.\\s*file|"
                    + "require\\s*\\(\\s*['\"](fs|child_process|net|http|https)['\"]\\s*\\))");

    private SandboxPolicy() {
    }

    static boolean violatesBoundary(String code) {
        return FORBIDDEN_BOUNDARY.matcher(stripNonImplementationText(code)).find();
    }

    static String stripNonImplementationText(String value) {
        return (value == null ? "" : value)
                .replaceAll("(?s)/\\*.*?\\*/", " ")
                .replaceAll("(?m)//.*$", " ")
                .replaceAll("(?s)\"\"\".*?\"\"\"", " ")
                .replaceAll("\"(?:\\\\.|[^\"\\\\])*\"", " ")
                .replaceAll("'(?:\\\\.|[^'\\\\])*'", " ")
                .replaceAll("`(?:\\\\.|[^`\\\\])*`", " ");
    }

    static String truncate(String value, int maxBytes) {
        if (value == null || value.isBlank()) {
            return value;
        }
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= maxBytes) {
            return value;
        }
        int length = Math.max(0, Math.min(maxBytes, bytes.length));
        while (length > 0 && (bytes[length - 1] & 0xC0) == 0x80) {
            length--;
        }
        return new String(Arrays.copyOf(bytes, length), StandardCharsets.UTF_8) + "\n...[truncated]";
    }
}

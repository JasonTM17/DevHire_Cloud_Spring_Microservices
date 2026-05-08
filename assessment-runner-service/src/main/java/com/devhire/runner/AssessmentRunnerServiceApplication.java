package com.devhire.runner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {
        "com.devhire.runner",
        "com.devhire.common.web"
})
public class AssessmentRunnerServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssessmentRunnerServiceApplication.class, args);
    }
}

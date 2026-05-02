package com.devhire.application;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableFeignClients
@EnableJpaAuditing
@SpringBootApplication(scanBasePackages = "com.devhire")
public class ApplicationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApplicationServiceApplication.class, args);
    }
}

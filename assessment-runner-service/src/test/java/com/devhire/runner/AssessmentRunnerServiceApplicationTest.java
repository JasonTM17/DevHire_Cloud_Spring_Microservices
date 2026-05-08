package com.devhire.runner;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.main.banner-mode=off",
        "management.tracing.enabled=false"
})
class AssessmentRunnerServiceApplicationTest {
    @Test
    void contextStartsWithoutDatabaseOrKafkaInfrastructure() {
    }
}

package com.devhire.gateway.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayArchitectureTest {
    private static final String ROOT_PACKAGE = "com.devhire.gateway";
    private final JavaClasses classes = new ClassFileImporter().importPackages(ROOT_PACKAGE);

    @Test
    void gatewayDoesNotDependOnServiceImplementations() {
        var violations = classes.stream()
                .flatMap(javaClass -> javaClass.getDirectDependenciesFromSelf().stream())
                .filter(dependency -> dependency.getTargetClass().getPackageName().startsWith("com.devhire."))
                .filter(dependency -> !dependency.getTargetClass().getPackageName().startsWith(ROOT_PACKAGE))
                .filter(dependency -> !dependency.getTargetClass().getPackageName().startsWith("com.devhire.common"))
                .map(Object::toString)
                .toList();

        assertThat(violations).isEmpty();
    }
}

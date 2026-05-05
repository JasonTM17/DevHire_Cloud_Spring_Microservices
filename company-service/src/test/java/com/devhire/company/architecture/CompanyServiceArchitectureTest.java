package com.devhire.company.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import jakarta.persistence.Version;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyServiceArchitectureTest {
    private static final String ROOT_PACKAGE = "com.devhire.company";
    private final JavaClasses classes = new ClassFileImporter().importPackages(ROOT_PACKAGE);

    @Test
    void controllersDoNotDependOnJpaEntities() {
        assertNoDependency(".controller.", ".entity.");
    }

    @Test
    void servicesDoNotDependOnControllers() {
        assertNoDependency(".service.", ".controller.");
    }

    @Test
    void serviceDoesNotDependOnOtherServicePackages() {
        assertNoCrossServiceDependency();
    }

    @Test
    void optimisticLockVersionFieldsUseJpaVersion() {
        assertVersionFieldsAreAnnotated();
    }

    private void assertNoDependency(String sourcePackageMarker, String targetPackageMarker) {
        var violations = classes.stream()
                .filter(javaClass -> javaClass.getPackageName().contains(sourcePackageMarker))
                .flatMap(javaClass -> javaClass.getDirectDependenciesFromSelf().stream())
                .filter(dependency -> dependency.getTargetClass().getPackageName().contains(targetPackageMarker))
                .map(Object::toString)
                .toList();
        assertThat(violations).isEmpty();
    }

    private void assertNoCrossServiceDependency() {
        var violations = classes.stream()
                .flatMap(javaClass -> javaClass.getDirectDependenciesFromSelf().stream())
                .filter(dependency -> dependency.getTargetClass().getPackageName().startsWith("com.devhire."))
                .filter(dependency -> !dependency.getTargetClass().getPackageName().startsWith(ROOT_PACKAGE))
                .filter(dependency -> !dependency.getTargetClass().getPackageName().startsWith("com.devhire.common"))
                .map(Object::toString)
                .toList();
        assertThat(violations).isEmpty();
    }

    private void assertVersionFieldsAreAnnotated() {
        var violations = classes.stream()
                .filter(javaClass -> javaClass.getPackageName().contains(".entity."))
                .flatMap(javaClass -> javaClass.getFields().stream())
                .filter(field -> field.getName().equals("version"))
                .filter(field -> !field.isAnnotatedWith(Version.class))
                .map(field -> field.getOwner().getName() + "#" + field.getName())
                .toList();
        assertThat(violations).isEmpty();
    }
}

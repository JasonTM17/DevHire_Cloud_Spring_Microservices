FROM maven:3.9.12-eclipse-temurin-21 AS build
WORKDIR /workspace
ARG SERVICE_NAME=company-service
COPY pom.xml .
COPY common-lib/pom.xml common-lib/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
COPY auth-service/pom.xml auth-service/pom.xml
COPY user-service/pom.xml user-service/pom.xml
COPY company-service/pom.xml company-service/pom.xml
COPY job-service/pom.xml job-service/pom.xml
COPY application-service/pom.xml application-service/pom.xml
COPY notification-service/pom.xml notification-service/pom.xml
COPY audit-service/pom.xml audit-service/pom.xml
RUN mvn -B -T1 -pl ${SERVICE_NAME} -am dependency:go-offline
COPY common-lib/src common-lib/src
COPY ${SERVICE_NAME}/src ${SERVICE_NAME}/src
RUN mvn -B -T1 -pl ${SERVICE_NAME} -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine
ARG SERVICE_NAME=company-service
ENV APP_HOME=/app
WORKDIR ${APP_HOME}
RUN addgroup -S devhire && adduser -S devhire -G devhire
COPY --from=build /workspace/${SERVICE_NAME}/target/${SERVICE_NAME}-*.jar app.jar
USER devhire
EXPOSE 8083
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]

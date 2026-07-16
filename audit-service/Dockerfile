FROM maven:3.9.15-eclipse-temurin-26 AS build
WORKDIR /workspace
ARG SERVICE_NAME=audit-service
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
COPY ai-service/pom.xml ai-service/pom.xml
COPY assessment-runner-service/pom.xml assessment-runner-service/pom.xml
COPY common-lib/src common-lib/src
COPY ${SERVICE_NAME}/src ${SERVICE_NAME}/src
RUN mvn -B -T1 -pl ${SERVICE_NAME} -am package -DskipTests

FROM eclipse-temurin:25-jre-alpine
ARG SERVICE_NAME=audit-service
ARG BUILD_VERSION=0.4.0-SNAPSHOT
ARG VCS_REF=local
ARG VCS_URL=https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices
ARG BUILD_CREATED=unknown
LABEL org.opencontainers.image.title="DevHire Cloud audit-service" \
      org.opencontainers.image.description="Administrative audit log ingestion and query service for DevHire Cloud" \
      org.opencontainers.image.source="${VCS_URL}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.created="${BUILD_CREATED}" \
      org.opencontainers.image.licenses="MIT"
ENV APP_HOME=/app
WORKDIR ${APP_HOME}
RUN apk upgrade --no-cache
RUN addgroup -S devhire && adduser -S devhire -G devhire
COPY --from=build /workspace/${SERVICE_NAME}/target/${SERVICE_NAME}-*.jar app.jar
USER devhire
EXPOSE 8087
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]

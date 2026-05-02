FROM maven:3.9.12-eclipse-temurin-21 AS build
WORKDIR /workspace
ARG SERVICE_NAME=notification-service
COPY pom.xml .
COPY common-lib/pom.xml common-lib/pom.xml
COPY ${SERVICE_NAME}/pom.xml ${SERVICE_NAME}/pom.xml
RUN mvn -B -T1 -pl ${SERVICE_NAME} -am dependency:go-offline
COPY common-lib/src common-lib/src
COPY ${SERVICE_NAME}/src ${SERVICE_NAME}/src
RUN mvn -B -T1 -pl ${SERVICE_NAME} -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine
ARG SERVICE_NAME=notification-service
ENV APP_HOME=/app
WORKDIR ${APP_HOME}
RUN addgroup -S devhire && adduser -S devhire -G devhire
COPY --from=build /workspace/${SERVICE_NAME}/target/${SERVICE_NAME}-*.jar app.jar
USER devhire
EXPOSE 8086
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]


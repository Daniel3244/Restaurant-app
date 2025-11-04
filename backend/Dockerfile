# syntax=docker/dockerfile:1.7

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
COPY src ./src

RUN mvn -B dependency:go-offline
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

ENV JAVA_OPTS=""
ENV SPRING_PROFILES_ACTIVE=prod

COPY --from=build /workspace/target/*.jar /app/app.jar

RUN mkdir -p /app/uploads /app/data/h2
VOLUME ["/app/uploads", "/app/data/h2"]

EXPOSE 8081

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]

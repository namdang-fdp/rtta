FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B -DskipTests dependency:go-offline
COPY src src
RUN ./mvnw -B -DskipTests package \
    && cp target/dorriss-0.0.1-SNAPSHOT.jar /workspace/application.jar

FROM eclipse-temurin:21-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 rtta \
    && useradd --system --uid 10001 --gid rtta --home-dir /app --shell /usr/sbin/nologin rtta
WORKDIR /app
COPY --from=build --chown=rtta:rtta /workspace/application.jar /app/application.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/application.jar"]

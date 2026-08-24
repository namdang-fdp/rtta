package com.rtta.dorriss;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

public abstract class PostgresIntegrationTestSupport {

	private static final DockerImageName PGVECTOR_IMAGE = DockerImageName
			.parse("pgvector/pgvector:0.8.6-pg17-bookworm")
			.asCompatibleSubstituteFor("postgres");

	private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(PGVECTOR_IMAGE)
			.withDatabaseName("rtta_test")
			.withUsername("rtta")
			.withPassword("rtta-test-only")
			.withInitScript("postgres-test-init.sql");

	static {
		POSTGRES.start();
	}

	@DynamicPropertySource
	static void postgresProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
	}
}

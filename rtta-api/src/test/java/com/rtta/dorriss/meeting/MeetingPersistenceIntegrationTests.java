package com.rtta.dorriss.meeting;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.rtta.dorriss.PostgresIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spike.enabled=false")
@Transactional
class MeetingPersistenceIntegrationTests extends PostgresIntegrationTestSupport {

	@Autowired
	private MeetingLifecycleService lifecycleService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void startIsIdempotentAndNormalStopCompletesMeeting() {
		UUID liveSessionId = UUID.randomUUID();
		Instant startedAt = Instant.parse("2026-08-25T00:00:00Z");

		Meeting first = lifecycleService.startMeeting(
				liveSessionId,
				"Quantum seminar",
				"en-US",
				"vi",
				startedAt,
				Map.of("transport", "extension"));
		Meeting second = lifecycleService.startMeeting(
				liveSessionId,
				"Ignored duplicate title",
				"en-US",
				"vi",
				startedAt,
				Map.of());

		assertThat(second.getId()).isEqualTo(first.getId());

		Instant endedAt = startedAt.plusSeconds(120);
		Meeting completed = lifecycleService.completeMeeting(liveSessionId, endedAt);

		assertThat(completed.getStatus()).isEqualTo(MeetingStatus.COMPLETED);
		assertThat(completed.getEndedAt()).isEqualTo(endedAt);
		assertThat(completed.getMetadata()).containsEntry("transport", "extension");
	}

	@Test
	void migrationUsesRealPgvectorWithoutFixingAnEmbeddingDimension() {
		String extensionVersion = jdbcTemplate.queryForObject(
				"SELECT extversion FROM pg_extension WHERE extname = 'vector'",
				String.class);
		String formattedType = jdbcTemplate.queryForObject("""
				SELECT format_type(attribute.atttypid, attribute.atttypmod)
				FROM pg_attribute attribute
				JOIN pg_class relation ON relation.oid = attribute.attrelid
				WHERE relation.relname = 'document_chunks'
				  AND attribute.attname = 'embedding'
				""", String.class);

		assertThat(extensionVersion).isEqualTo("0.8.6");
		assertThat(formattedType).isEqualTo("vector");
	}
}

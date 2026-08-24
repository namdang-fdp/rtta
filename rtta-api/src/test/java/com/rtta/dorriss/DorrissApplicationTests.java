package com.rtta.dorriss;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "spike.enabled=false")
class DorrissApplicationTests extends PostgresIntegrationTestSupport {

	@Test
	void contextLoads() {
	}

}

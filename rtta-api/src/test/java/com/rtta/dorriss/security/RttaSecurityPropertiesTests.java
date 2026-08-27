package com.rtta.dorriss.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.util.Arrays;

import org.junit.jupiter.api.Test;

class RttaSecurityPropertiesTests {

	@Test
	void exposesOnlyHouseholdAndWebOriginSecurityConfiguration() {
		assertThat(Arrays.stream(RttaSecurityProperties.class.getDeclaredFields())
				.map(Field::getName))
				.containsExactlyInAnyOrder("householdCode", "webAllowedOrigins");
	}
}

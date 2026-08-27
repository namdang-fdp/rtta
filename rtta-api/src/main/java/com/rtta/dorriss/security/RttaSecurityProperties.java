package com.rtta.dorriss.security;

import java.util.Arrays;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "rtta.security")
public class RttaSecurityProperties {

	private String householdCode = "";
	private String webAllowedOrigins = "http://localhost:3000";

	public String getHouseholdCode() { return householdCode; }
	public void setHouseholdCode(String householdCode) { this.householdCode = householdCode; }
	public String getWebAllowedOrigins() { return webAllowedOrigins; }
	public void setWebAllowedOrigins(String webAllowedOrigins) { this.webAllowedOrigins = webAllowedOrigins; }

	public List<String> webOrigins() { return origins(webAllowedOrigins); }

	private List<String> origins(String value) {
		if (value == null || value.isBlank()) return List.of();
		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(origin -> !origin.isEmpty())
				.distinct()
				.toList();
	}
}

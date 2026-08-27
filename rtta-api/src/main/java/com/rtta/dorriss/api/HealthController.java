package com.rtta.dorriss.api;

import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class HealthController {

	@GetMapping("/health")
	ResponseEntity<Map<String, String>> health() {
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(Map.of("status", "UP"));
	}
}

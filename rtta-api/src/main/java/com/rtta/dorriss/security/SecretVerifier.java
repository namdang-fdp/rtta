package com.rtta.dorriss.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.stereotype.Component;

@Component
public final class SecretVerifier {

	public boolean matches(String supplied, String expected) {
		byte[] suppliedDigest = digest(supplied == null ? "" : supplied);
		byte[] expectedDigest = digest(expected == null ? "" : expected);
		return expected != null && !expected.isBlank()
				&& MessageDigest.isEqual(suppliedDigest, expectedDigest);
	}

	private byte[] digest(String value) {
		try {
			return MessageDigest.getInstance("SHA-256")
					.digest(value.getBytes(StandardCharsets.UTF_8));
		}
		catch (java.security.NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is unavailable", exception);
		}
	}
}

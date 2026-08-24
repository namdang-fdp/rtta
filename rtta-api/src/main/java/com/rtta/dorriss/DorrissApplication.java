package com.rtta.dorriss;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
public class DorrissApplication {

	public static void main(String[] args) {
		ConfigurableApplicationContext context = SpringApplication.run(DorrissApplication.class, args);
		int exitCode = SpringApplication.exit(context);
		System.exit(exitCode);
	}

}

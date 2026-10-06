package com.emili.libros;

import org.springframework.boot.SpringApplication;

public class TestLibrosTrackerApplication {

	public static void main(String[] args) {
		SpringApplication.from(LibrosTrackerApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

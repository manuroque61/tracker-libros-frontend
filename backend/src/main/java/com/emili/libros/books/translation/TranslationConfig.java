package com.emili.libros.books.translation;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(TranslationProperties.class)
public class TranslationConfig {
}

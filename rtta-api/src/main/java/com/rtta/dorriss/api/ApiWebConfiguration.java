package com.rtta.dorriss.api;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
class ApiWebConfiguration implements WebMvcConfigurer {
}

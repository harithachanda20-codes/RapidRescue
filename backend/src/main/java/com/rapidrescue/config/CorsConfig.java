package com.rapidrescue.config;
import org.springframework.context.annotation.*; import org.springframework.web.servlet.config.annotation.*;
@Configuration public class CorsConfig implements WebMvcConfigurer { public void addCorsMappings(CorsRegistry r){r.addMapping("/**").allowedOrigins("http://localhost:5173","http://localhost:3000").allowedMethods("*").allowedHeaders("*");}}

package com.rapidrescue.config;

import com.rapidrescue.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

 @Bean
 PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder();
 }

 @Bean
 CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration configuration = new CorsConfiguration();

  configuration.setAllowedOrigins(List.of(
          "http://localhost:5173",
          "http://localhost:5174"
  ));

  configuration.setAllowedMethods(List.of(
          "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
  ));

  configuration.setAllowedHeaders(List.of("*"));
  configuration.setAllowCredentials(true);

  UrlBasedCorsConfigurationSource source =
          new UrlBasedCorsConfigurationSource();

  source.registerCorsConfiguration("/**", configuration);

  return source;
 }

 @Bean
 SecurityFilterChain filterChain(
         HttpSecurity http,
         JwtAuthenticationFilter jwt
 ) throws Exception {

  http
          .csrf(csrf -> csrf.disable())
          .cors(cors -> {})
          .sessionManagement(session ->
                  session.sessionCreationPolicy(
                          SessionCreationPolicy.STATELESS
                  )
          )
          .authorizeHttpRequests(auth -> auth
                  .requestMatchers(
                          "/api/auth/**",
                          "/api/health",
                          "/ws/**",
                          "/api/tracking/**"
                  ).permitAll()
                  .anyRequest().authenticated()
          )
          .addFilterBefore(
                  jwt,
                  UsernamePasswordAuthenticationFilter.class
          );

  return http.build();
 }
}
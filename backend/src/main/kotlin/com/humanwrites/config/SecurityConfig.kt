package com.humanwrites.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() } // Will be properly configured later
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/actuator/**")
                    .permitAll()
                    .requestMatchers("/api-docs/**", "/swagger-ui/**")
                    .permitAll()
                    .requestMatchers("/api/verify/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            }
        return http.build()
    }
}

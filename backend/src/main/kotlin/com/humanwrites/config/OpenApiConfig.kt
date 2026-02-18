package com.humanwrites.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Contact
import io.swagger.v3.oas.models.info.Info
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {
    @Bean
    fun openApi(): OpenAPI =
        OpenAPI()
            .info(
                Info()
                    .title("HumanWrites API")
                    .version("1.0.0")
                    .description("API for HumanWrites - proving human authorship through keystroke dynamics")
                    .contact(Contact().name("HumanWrites Team")),
            )
}

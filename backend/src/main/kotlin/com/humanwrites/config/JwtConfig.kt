package com.humanwrites.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.jwt")
data class JwtConfig(
    val secret: String,
    val accessTokenExpiry: Long,
    val refreshTokenExpiry: Long,
    val cookieDomain: String,
    val secureCookie: Boolean,
)

package com.humanwrites.infrastructure.security

import com.humanwrites.config.JwtConfig
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Component
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    private val jwtConfig: JwtConfig,
) {
    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtConfig.secret.toByteArray())
    }

    fun generateAccessToken(
        userId: UUID,
        email: String,
    ): String =
        Jwts
            .builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("type", "access")
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + jwtConfig.accessTokenExpiry))
            .signWith(key)
            .compact()

    fun generateRefreshToken(userId: UUID): String =
        Jwts
            .builder()
            .subject(userId.toString())
            .claim("type", "refresh")
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + jwtConfig.refreshTokenExpiry))
            .signWith(key)
            .compact()

    fun validateToken(token: String): UUID? =
        try {
            val claims =
                Jwts
                    .parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
            UUID.fromString(claims.payload.subject)
        } catch (_: Exception) {
            null
        }

    fun getTokenType(token: String): String? =
        try {
            val claims =
                Jwts
                    .parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
            claims.payload["type"] as? String
        } catch (_: Exception) {
            null
        }
}

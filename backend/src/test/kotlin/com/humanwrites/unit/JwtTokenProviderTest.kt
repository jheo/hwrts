package com.humanwrites.unit

import com.humanwrites.config.JwtConfig
import com.humanwrites.infrastructure.security.JwtTokenProvider
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import java.util.UUID

class JwtTokenProviderTest :
    DescribeSpec({

        val config =
            JwtConfig(
                secret = "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256-algorithm",
                accessTokenExpiry = 900_000L,
                refreshTokenExpiry = 604_800_000L,
                cookieDomain = "localhost",
                secureCookie = false,
            )

        val provider = JwtTokenProvider(config)

        describe("generateAccessToken") {
            it("creates a valid token that can be validated") {
                val userId = UUID.randomUUID()
                val email = "test@example.com"

                val token = provider.generateAccessToken(userId, email)

                provider.validateToken(token) shouldBe userId
            }

            it("creates a token with type 'access'") {
                val userId = UUID.randomUUID()
                val token = provider.generateAccessToken(userId, "test@example.com")

                provider.getTokenType(token) shouldBe "access"
            }
        }

        describe("generateRefreshToken") {
            it("creates a valid token that can be validated") {
                val userId = UUID.randomUUID()

                val token = provider.generateRefreshToken(userId)

                provider.validateToken(token) shouldBe userId
            }

            it("creates a token with type 'refresh'") {
                val userId = UUID.randomUUID()
                val token = provider.generateRefreshToken(userId)

                provider.getTokenType(token) shouldBe "refresh"
            }
        }

        describe("validateToken") {
            it("returns userId for a valid access token") {
                val userId = UUID.randomUUID()
                val token = provider.generateAccessToken(userId, "test@example.com")

                val result = provider.validateToken(token)

                result.shouldNotBeNull()
                result shouldBe userId
            }

            it("returns userId for a valid refresh token") {
                val userId = UUID.randomUUID()
                val token = provider.generateRefreshToken(userId)

                val result = provider.validateToken(token)

                result.shouldNotBeNull()
                result shouldBe userId
            }

            it("returns null for an invalid token") {
                val result = provider.validateToken("invalid.token.here")

                result.shouldBeNull()
            }

            it("returns null for an empty token") {
                val result = provider.validateToken("")

                result.shouldBeNull()
            }

            it("returns null for a token signed with a different key") {
                val otherConfig =
                    JwtConfig(
                        secret = "other-secret-key-must-also-be-at-least-256-bits-long-for-hmac-sha256",
                        accessTokenExpiry = 900_000L,
                        refreshTokenExpiry = 604_800_000L,
                        cookieDomain = "localhost",
                        secureCookie = false,
                    )
                val otherProvider = JwtTokenProvider(otherConfig)
                val token = otherProvider.generateAccessToken(UUID.randomUUID(), "test@example.com")

                val result = provider.validateToken(token)

                result.shouldBeNull()
            }

            it("returns null for an expired token") {
                val expiredConfig =
                    JwtConfig(
                        secret = "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256-algorithm",
                        accessTokenExpiry = -1000L,
                        refreshTokenExpiry = -1000L,
                        cookieDomain = "localhost",
                        secureCookie = false,
                    )
                val expiredProvider = JwtTokenProvider(expiredConfig)
                val token = expiredProvider.generateAccessToken(UUID.randomUUID(), "test@example.com")

                val result = provider.validateToken(token)

                result.shouldBeNull()
            }
        }

        describe("getTokenType") {
            it("returns 'access' for access tokens") {
                val token = provider.generateAccessToken(UUID.randomUUID(), "test@example.com")

                provider.getTokenType(token) shouldBe "access"
            }

            it("returns 'refresh' for refresh tokens") {
                val token = provider.generateRefreshToken(UUID.randomUUID())

                provider.getTokenType(token) shouldBe "refresh"
            }

            it("returns null for invalid tokens") {
                provider.getTokenType("invalid.token").shouldBeNull()
            }
        }
    })

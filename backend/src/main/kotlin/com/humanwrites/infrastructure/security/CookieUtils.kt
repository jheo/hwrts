package com.humanwrites.infrastructure.security

import com.humanwrites.config.JwtConfig
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component

@Component
class CookieUtils(
    private val jwtConfig: JwtConfig,
) {
    fun addAccessTokenCookie(
        response: HttpServletResponse,
        token: String,
    ) {
        val cookie =
            ResponseCookie
                .from("access_token", token)
                .httpOnly(true)
                .secure(jwtConfig.secureCookie)
                .path("/")
                .maxAge(jwtConfig.accessTokenExpiry / 1000)
                .sameSite("Lax")
                .build()
        response.addHeader("Set-Cookie", cookie.toString())
    }

    fun addRefreshTokenCookie(
        response: HttpServletResponse,
        token: String,
    ) {
        val cookie =
            ResponseCookie
                .from("refresh_token", token)
                .httpOnly(true)
                .secure(jwtConfig.secureCookie)
                .path("/api/auth/refresh")
                .maxAge(jwtConfig.refreshTokenExpiry / 1000)
                .sameSite("Lax")
                .build()
        response.addHeader("Set-Cookie", cookie.toString())
    }

    fun clearAuthCookies(response: HttpServletResponse) {
        val clearAccess =
            ResponseCookie
                .from("access_token", "")
                .httpOnly(true)
                .secure(jwtConfig.secureCookie)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build()
        val clearRefresh =
            ResponseCookie
                .from("refresh_token", "")
                .httpOnly(true)
                .secure(jwtConfig.secureCookie)
                .path("/api/auth/refresh")
                .maxAge(0)
                .sameSite("Lax")
                .build()
        response.addHeader("Set-Cookie", clearAccess.toString())
        response.addHeader("Set-Cookie", clearRefresh.toString())
    }
}

package com.humanwrites.infrastructure.security

import com.humanwrites.domain.user.UserService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component

@Component
class GoogleOAuth2Handler(
    private val userService: UserService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val cookieUtils: CookieUtils,
    @Value("\${app.cors.allowed-origins:http://localhost:3000}") private val allowedOrigins: String,
) : AuthenticationSuccessHandler {
    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val oauth2User = authentication.principal as OAuth2User
        val email =
            oauth2User.getAttribute<String>("email")
                ?: throw IllegalStateException("Email not provided by Google")
        val name =
            oauth2User.getAttribute<String>("name")
                ?: email.substringBefore("@")
        val picture = oauth2User.getAttribute<String>("picture")
        val googleId =
            oauth2User.getAttribute<String>("sub")
                ?: throw IllegalStateException("Google ID not provided")

        val user =
            userService.findOrCreateByOAuth(
                provider = "google",
                providerId = googleId,
                email = email,
                displayName = name,
                avatarUrl = picture,
            )

        val accessToken = jwtTokenProvider.generateAccessToken(user.id, user.email)
        val refreshToken = jwtTokenProvider.generateRefreshToken(user.id)

        cookieUtils.addAccessTokenCookie(response, accessToken)
        cookieUtils.addRefreshTokenCookie(response, refreshToken)

        val frontendUrl = allowedOrigins.split(",").first().trim()
        response.sendRedirect("$frontendUrl/editor")
    }
}

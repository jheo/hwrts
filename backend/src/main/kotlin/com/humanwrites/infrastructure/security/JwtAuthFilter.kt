package com.humanwrites.infrastructure.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    private val jwtTokenProvider: JwtTokenProvider,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val token =
            request.cookies
                ?.find { it.name == "access_token" }
                ?.value

        if (token != null) {
            val userId = jwtTokenProvider.validateToken(token)
            val tokenType = jwtTokenProvider.getTokenType(token)
            if (userId != null && tokenType == "access") {
                val auth =
                    UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        emptyList(),
                    )
                SecurityContextHolder.getContext().authentication = auth
            }
        }

        filterChain.doFilter(request, response)
    }
}

package com.humanwrites.presentation.rest

import com.humanwrites.domain.user.UserService
import com.humanwrites.infrastructure.security.CookieUtils
import com.humanwrites.infrastructure.security.JwtTokenProvider
import com.humanwrites.presentation.dto.request.LoginRequest
import com.humanwrites.presentation.dto.request.RegisterRequest
import com.humanwrites.presentation.dto.response.AuthResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "인증 API")
class AuthController(
    private val userService: UserService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val cookieUtils: CookieUtils,
    private val passwordEncoder: PasswordEncoder,
) {
    @PostMapping("/register")
    @Operation(summary = "회원가입", description = "이메일/비밀번호로 회원가입")
    fun register(
        @Valid @RequestBody req: RegisterRequest,
        response: HttpServletResponse,
    ): ResponseEntity<AuthResponse> {
        val existing = userService.findByEmail(req.email)
        if (existing != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build()
        }

        val hashedPassword = passwordEncoder.encode(req.password)
        val user = userService.register(req.email, req.displayName, hashedPassword)

        val accessToken = jwtTokenProvider.generateAccessToken(user.id, user.email)
        val refreshToken = jwtTokenProvider.generateRefreshToken(user.id)
        cookieUtils.addAccessTokenCookie(response, accessToken)
        cookieUtils.addRefreshTokenCookie(response, refreshToken)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(user.toAuthResponse())
    }

    @PostMapping("/login")
    @Operation(summary = "로그인", description = "이메일/비밀번호로 로그인")
    fun login(
        @Valid @RequestBody req: LoginRequest,
        response: HttpServletResponse,
    ): ResponseEntity<AuthResponse> {
        val user = userService.findByEmail(req.email)

        // Always perform password comparison to prevent timing attacks
        val dummyHash =
            "\$argon2id\$v=19\$m=16384,t=2,p=1\$aaaaaaaaaaaaaaaa\$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        val passwordHash = user?.passwordHash ?: dummyHash
        val matches = passwordEncoder.matches(req.password, passwordHash)

        if (user == null || !matches) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val accessToken = jwtTokenProvider.generateAccessToken(user.id, user.email)
        val refreshToken = jwtTokenProvider.generateRefreshToken(user.id)
        cookieUtils.addAccessTokenCookie(response, accessToken)
        cookieUtils.addRefreshTokenCookie(response, refreshToken)

        return ResponseEntity.ok(user.toAuthResponse())
    }

    @PostMapping("/refresh")
    @Operation(summary = "토큰 갱신", description = "Refresh token으로 새 access token 발급")
    fun refresh(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): ResponseEntity<AuthResponse> {
        val refreshToken =
            request.cookies
                ?.find { it.name == "refresh_token" }
                ?.value
                ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val tokenType = jwtTokenProvider.getTokenType(refreshToken)
        if (tokenType != "refresh") {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val userId =
            jwtTokenProvider.validateToken(refreshToken)
                ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val user =
            userService.findById(userId)
                ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val newAccessToken = jwtTokenProvider.generateAccessToken(user.id, user.email)
        cookieUtils.addAccessTokenCookie(response, newAccessToken)

        return ResponseEntity.ok(user.toAuthResponse())
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃", description = "인증 쿠키 삭제")
    fun logout(response: HttpServletResponse): ResponseEntity<Void> {
        cookieUtils.clearAuthCookies(response)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/me")
    @Operation(summary = "현재 사용자 조회", description = "인증된 사용자 정보 반환")
    fun me(): ResponseEntity<AuthResponse> {
        val userId = currentUserId()
        val user =
            userService.findById(userId)
                ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(user.toAuthResponse())
    }

    private fun currentUserId(): UUID = SecurityContextHolder.getContext().authentication.principal as UUID

    private fun com.humanwrites.domain.user.UserEntity.toAuthResponse() =
        AuthResponse(
            userId = id.toString(),
            email = email,
            displayName = displayName,
        )
}

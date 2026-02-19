package com.humanwrites.config

import com.humanwrites.infrastructure.security.JwtTokenProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.MessageDeliveryException
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
    private val jwtTokenProvider: JwtTokenProvider,
    @Value("\${app.cors.allowed-origins:http://localhost:3000}") private val allowedOrigins: String,
) : WebSocketMessageBrokerConfigurer {
    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Enable simple broker for server→client destinations
        registry.enableSimpleBroker("/queue", "/topic")
        // Client→server destination prefix
        registry.setApplicationDestinationPrefixes("/app")
        // User-specific destination prefix
        registry.setUserDestinationPrefix("/user")
    }

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
            .addEndpoint("/ws")
            .setAllowedOrigins(*allowedOrigins.split(",").map { it.trim() }.toTypedArray())
        // No SockJS - pure WebSocket only
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration.interceptors(
            object : ChannelInterceptor {
                override fun preSend(
                    message: Message<*>,
                    channel: MessageChannel,
                ): Message<*> {
                    val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
                    if (accessor != null && StompCommand.CONNECT == accessor.command) {
                        val token = accessor.getFirstNativeHeader("Authorization")?.removePrefix("Bearer ")
                        if (token == null) {
                            throw MessageDeliveryException("Missing Authorization header")
                        }
                        val userId =
                            jwtTokenProvider.validateToken(token)
                                ?: throw MessageDeliveryException("Invalid or expired JWT token")
                        val auth =
                            UsernamePasswordAuthenticationToken(
                                userId.toString(),
                                null,
                                listOf(SimpleGrantedAuthority("ROLE_USER")),
                            )
                        accessor.user = auth
                    }
                    return message
                }
            },
        )
    }
}

package com.humanwrites.presentation.dto.request

import java.util.UUID

data class SessionStartRequest(
    val documentId: UUID,
)

data class KeystrokeBatchMessage(
    val sessionId: UUID,
    val events: List<KeystrokeEventDto>,
)

data class KeystrokeEventDto(
    val eventType: String,
    val keyCategory: String,
    val timestampMs: Long,
    val dwellTimeMs: Int? = null,
    val flightTimeMs: Int? = null,
)

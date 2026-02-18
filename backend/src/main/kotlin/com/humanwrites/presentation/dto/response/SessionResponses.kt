package com.humanwrites.presentation.dto.response

import java.util.UUID

data class SessionStartResponse(
    val sessionId: UUID,
    val status: String = "active",
)

data class SessionStatusMessage(
    val sessionId: UUID,
    val status: String,
    val totalKeystrokes: Int,
    val anomalyCount: Int = 0,
)

data class AnomalyAlertMessage(
    val sessionId: UUID,
    val type: String,
    val severity: String,
    val message: String,
    val confidence: Double,
)

package com.humanwrites.domain.session.analysis

import org.springframework.stereotype.Service

/**
 * Real-time anomaly detection during active writing sessions.
 * Detects suspicious patterns and generates alerts.
 */
enum class AnomalyType {
    UNREALISTIC_SPEED,
    MECHANICAL_RHYTHM,
    EXCESSIVE_PASTE,
    NO_THINKING_PAUSES,
}

data class AnomalyAlert(
    val type: AnomalyType,
    val severity: String,
    val message: String,
    val confidence: Double,
    val details: Map<String, Any>,
)

@Service
class AnomalyDetector(
    private val keystrokeAnalyzer: KeystrokeAnalyzer,
) {
    companion object {
        const val CV_CRITICAL_THRESHOLD = 0.05
        const val ENTROPY_CRITICAL_THRESHOLD = 2.0
        const val PASTE_RATIO_WARNING = 0.30
        const val PASTE_RATIO_CRITICAL = 0.50
        const val MIN_WINDOWS_FOR_DETECTION = 3
    }

    /**
     * Analyze recent windows for anomalies.
     * Called periodically during active session.
     */
    fun detect(
        windows: List<KeystrokeWindow>,
        pasteRatio: Double = 0.0,
    ): List<AnomalyAlert> {
        if (windows.size < MIN_WINDOWS_FOR_DETECTION) return emptyList()

        val alerts = mutableListOf<AnomalyAlert>()

        detectUnrealisticSpeed(windows)?.let { alerts.add(it) }
        detectMechanicalRhythm(windows)?.let { alerts.add(it) }
        detectExcessivePaste(pasteRatio)?.let { alerts.add(it) }
        detectNoThinkingPauses(windows)?.let { alerts.add(it) }

        return alerts
    }

    private fun detectUnrealisticSpeed(windows: List<KeystrokeWindow>): AnomalyAlert? {
        val wpms = windows.map { it.wpm }.filter { it > 0 }
        if (wpms.isEmpty()) return null

        val mean = wpms.average()
        val stdDev =
            if (wpms.size > 1) {
                val variance = wpms.sumOf { (it - mean) * (it - mean) } / (wpms.size - 1)
                kotlin.math.sqrt(variance)
            } else {
                0.0
            }
        val cv = if (mean > 0) stdDev / mean else 0.0

        return if (cv < CV_CRITICAL_THRESHOLD && mean > 30) {
            AnomalyAlert(
                type = AnomalyType.UNREALISTIC_SPEED,
                severity = "critical",
                message = "Unrealistically consistent typing speed detected",
                confidence = ((CV_CRITICAL_THRESHOLD - cv) / CV_CRITICAL_THRESHOLD).coerceIn(0.0, 1.0),
                details = mapOf("cv" to cv, "avgWpm" to mean),
            )
        } else {
            null
        }
    }

    private fun detectMechanicalRhythm(windows: List<KeystrokeWindow>): AnomalyAlert? {
        val allFlightTimes = windows.flatMap { it.flightTimes }
        if (allFlightTimes.size < 20) return null

        val entropy = keystrokeAnalyzer.calculateShannonEntropy(allFlightTimes, bucketSize = 50)

        return if (entropy < ENTROPY_CRITICAL_THRESHOLD) {
            AnomalyAlert(
                type = AnomalyType.MECHANICAL_RHYTHM,
                severity = "critical",
                message = "Mechanical typing rhythm detected",
                confidence = ((ENTROPY_CRITICAL_THRESHOLD - entropy) / ENTROPY_CRITICAL_THRESHOLD).coerceIn(0.0, 1.0),
                details = mapOf("entropy" to entropy),
            )
        } else {
            null
        }
    }

    private fun detectExcessivePaste(pasteRatio: Double): AnomalyAlert? =
        when {
            pasteRatio >= PASTE_RATIO_CRITICAL ->
                AnomalyAlert(
                    type = AnomalyType.EXCESSIVE_PASTE,
                    severity = "critical",
                    message = "Excessive paste operations detected",
                    confidence = pasteRatio.coerceAtMost(1.0),
                    details = mapOf("pasteRatio" to pasteRatio),
                )
            pasteRatio >= PASTE_RATIO_WARNING ->
                AnomalyAlert(
                    type = AnomalyType.EXCESSIVE_PASTE,
                    severity = "warning",
                    message = "High paste ratio detected",
                    confidence = (pasteRatio / PASTE_RATIO_CRITICAL).coerceAtMost(1.0),
                    details = mapOf("pasteRatio" to pasteRatio),
                )
            else -> null
        }

    private fun detectNoThinkingPauses(windows: List<KeystrokeWindow>): AnomalyAlert? {
        val totalPauses = windows.sumOf { it.pauseCount }
        val totalMinutes =
            if (windows.isNotEmpty()) {
                (windows.last().windowEnd - windows.first().windowStart) / 60000.0
            } else {
                return null
            }

        if (totalMinutes < 1.0) return null

        val pauseFrequency = totalPauses / totalMinutes

        return if (pauseFrequency < 0.3) {
            AnomalyAlert(
                type = AnomalyType.NO_THINKING_PAUSES,
                severity = "warning",
                message = "Absence of natural thinking pauses",
                confidence = ((0.5 - pauseFrequency) / 0.5).coerceIn(0.0, 1.0),
                details = mapOf("pauseFrequency" to pauseFrequency, "totalMinutes" to totalMinutes),
            )
        } else {
            null
        }
    }
}

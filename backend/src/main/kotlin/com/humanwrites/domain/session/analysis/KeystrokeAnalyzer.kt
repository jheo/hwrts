package com.humanwrites.domain.session.analysis

import org.springframework.stereotype.Component
import kotlin.math.ln
import kotlin.math.sqrt

/**
 * Layer 1 keystroke dynamics analysis engine.
 * Calculates human-likeness metrics from typing patterns.
 */
data class KeystrokeMetrics(
    val avgWpm: Double,
    val wpmVariance: Double,
    val typingSpeedCV: Double,
    val flightTimeEntropy: Double,
    val errorCorrectionRate: Double,
    val pausePatternEntropy: Double,
    val burstPauseRatio: Double,
    val fatigueSlope: Double,
    val thinkingPauseFrequency: Double,
)

data class KeystrokeWindow(
    val windowStart: Long,
    val windowEnd: Long,
    val keystrokes: Int,
    val wpm: Double,
    val avgFlightTime: Double,
    val avgDwellTime: Double,
    val errorCount: Int,
    val totalKeys: Int,
    val pauseCount: Int,
    val flightTimes: List<Long>,
)

@Component
class KeystrokeAnalyzer {
    companion object {
        const val DEFAULT_CV_MIN = 0.15
        const val DEFAULT_CV_MAX = 0.60
        const val DEFAULT_ENTROPY_MIN = 3.0
        const val DEFAULT_ERROR_RATE_MIN = 0.03
        const val DEFAULT_ERROR_RATE_MAX = 0.20
        const val DEFAULT_THINKING_PAUSE_MIN = 0.5
        const val DEFAULT_THINKING_PAUSE_MAX = 8.0
    }

    /**
     * Aggregate 5-second windows into overall metrics for a session.
     */
    fun analyze(windows: List<KeystrokeWindow>): KeystrokeMetrics {
        if (windows.isEmpty()) {
            return emptyMetrics()
        }

        val wpms = windows.map { it.wpm }.filter { it > 0 }
        val avgWpm = wpms.average().takeIf { !it.isNaN() } ?: 0.0
        val wpmStdDev = standardDeviation(wpms)
        val typingSpeedCV = if (avgWpm > 0) wpmStdDev / avgWpm else 0.0

        // Flight time entropy across all windows
        val allFlightTimes = windows.flatMap { it.flightTimes }
        val flightTimeEntropy =
            if (allFlightTimes.size >= 10) {
                calculateShannonEntropy(allFlightTimes, bucketSize = 50)
            } else {
                -1.0 // Insufficient data sentinel
            }

        // Error correction rate
        val totalErrors = windows.sumOf { it.errorCount }
        val totalKeys = windows.sumOf { it.totalKeys }
        val errorCorrectionRate = if (totalKeys > 0) totalErrors.toDouble() / totalKeys else 0.0

        // Pause pattern entropy
        val pauseDurations = extractPauseDurations(allFlightTimes, threshold = 2000L)
        val pausePatternEntropy =
            if (pauseDurations.size > 1) {
                calculateShannonEntropy(pauseDurations, bucketSize = 500)
            } else {
                0.0
            }

        // Burst-pause ratio
        val totalTime =
            if (windows.isNotEmpty()) {
                (windows.last().windowEnd - windows.first().windowStart).toDouble()
            } else {
                1.0
            }
        val pauseTime = pauseDurations.sum().toDouble()
        val burstTime = totalTime - pauseTime
        val burstPauseRatio =
            when {
                pauseTime > 0 && burstTime > 0 -> burstTime / pauseTime
                pauseTime == 0.0 && burstTime > 0 -> burstTime // No pauses - use burst time directly
                else -> 0.0
            }

        // Fatigue slope (linear regression of WPM over time)
        val fatigueSlope = calculateFatigueSlope(windows)

        // Thinking pause frequency (per minute)
        val totalMinutes = totalTime / 60000.0
        val totalPauses = windows.sumOf { it.pauseCount }
        val thinkingPauseFrequency = if (totalMinutes > 0) totalPauses / totalMinutes else 0.0

        return KeystrokeMetrics(
            avgWpm = avgWpm,
            wpmVariance = wpmStdDev * wpmStdDev,
            typingSpeedCV = typingSpeedCV,
            flightTimeEntropy = flightTimeEntropy,
            errorCorrectionRate = errorCorrectionRate,
            pausePatternEntropy = pausePatternEntropy,
            burstPauseRatio = burstPauseRatio,
            fatigueSlope = fatigueSlope,
            thinkingPauseFrequency = thinkingPauseFrequency,
        )
    }

    private fun emptyMetrics() = KeystrokeMetrics(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    private fun standardDeviation(values: List<Double>): Double {
        if (values.size < 2) return 0.0
        val mean = values.average()
        val variance = values.sumOf { (it - mean) * (it - mean) } / (values.size - 1)
        return sqrt(variance)
    }

    /**
     * Shannon entropy of a distribution, bucketed by [bucketSize] ms.
     */
    fun calculateShannonEntropy(
        values: List<Long>,
        bucketSize: Int,
    ): Double {
        if (values.isEmpty()) return 0.0
        val buckets = values.groupBy { it / bucketSize }
        val total = values.size.toDouble()
        return -buckets.values.sumOf { bucket ->
            val p = bucket.size / total
            if (p > 0) p * ln(p) / ln(2.0) else 0.0
        }
    }

    private fun extractPauseDurations(
        flightTimes: List<Long>,
        threshold: Long,
    ): List<Long> = flightTimes.filter { it >= threshold }

    /**
     * Linear regression slope of WPM over window index.
     * Negative slope indicates fatigue (expected for humans).
     */
    private fun calculateFatigueSlope(windows: List<KeystrokeWindow>): Double {
        if (windows.size < 2) return 0.0
        val n = windows.size.toDouble()
        val xs = windows.indices.map { it.toDouble() }
        val ys = windows.map { it.wpm }
        val xMean = xs.average()
        val yMean = ys.average()
        val numerator = xs.zip(ys).sumOf { (x, y) -> (x - xMean) * (y - yMean) }
        val denominator = xs.sumOf { (it - xMean) * (it - xMean) }
        return if (denominator > 0) numerator / denominator else 0.0
    }
}

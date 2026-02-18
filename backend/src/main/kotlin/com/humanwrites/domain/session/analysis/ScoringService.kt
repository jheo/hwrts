package com.humanwrites.domain.session.analysis

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.scoring")
data class ScoringConfig(
    val cvMin: Double = 0.15,
    val cvMax: Double = 0.60,
    val entropyMin: Double = 3.0,
    val errorRateMin: Double = 0.03,
    val errorRateMax: Double = 0.20,
    val thinkingPauseMin: Double = 0.5,
    val thinkingPauseMax: Double = 8.0,
    val certifiedThreshold: Int = 60,
)

data class ScoringResult(
    val overallScore: Int,
    val grade: String,
    val label: String,
    val keystrokeDynamics: KeystrokeDynamicsScore,
)

data class KeystrokeDynamicsScore(
    val score: Int,
    val typingSpeedVariance: Double,
    val errorCorrectionRate: Double,
    val pausePatternEntropy: Double,
)

class ScoringService(
    private val config: ScoringConfig = ScoringConfig(),
) {
    /**
     * Calculate overall score from keystroke metrics.
     * MVP: binary grading (Certified / Not Certified).
     */
    fun score(metrics: KeystrokeMetrics): ScoringResult {
        // Individual dimension scores (0-100 each)
        val cvScore = rangeScore(metrics.typingSpeedCV, config.cvMin, config.cvMax)
        val entropyScore = thresholdScore(metrics.flightTimeEntropy, config.entropyMin, maxExpected = 6.0)
        val errorScore = rangeScore(metrics.errorCorrectionRate, config.errorRateMin, config.errorRateMax)
        val pauseScore = rangeScore(metrics.thinkingPauseFrequency, config.thinkingPauseMin, config.thinkingPauseMax)
        val fatigueScore = fatigueScore(metrics.fatigueSlope)
        val burstScore = burstPauseScore(metrics.burstPauseRatio)

        // Weighted average (Layer 1 weights)
        val overallScore =
            (
                cvScore * 0.20 +
                    entropyScore * 0.25 +
                    errorScore * 0.15 +
                    pauseScore * 0.15 +
                    fatigueScore * 0.10 +
                    burstScore * 0.15
            ).toInt().coerceIn(0, 100)

        val grade = if (overallScore >= config.certifiedThreshold) "Certified" else "Not Certified"
        val label =
            when {
                overallScore >= 80 -> "Highly likely human-written"
                overallScore >= config.certifiedThreshold -> "Likely human-written"
                overallScore >= 40 -> "Inconclusive"
                else -> "Unlikely human-written"
            }

        return ScoringResult(
            overallScore = overallScore,
            grade = grade,
            label = label,
            keystrokeDynamics =
                KeystrokeDynamicsScore(
                    score = overallScore,
                    typingSpeedVariance = metrics.typingSpeedCV,
                    errorCorrectionRate = metrics.errorCorrectionRate,
                    pausePatternEntropy = metrics.pausePatternEntropy,
                ),
        )
    }

    /**
     * Score based on value being within an expected range.
     * Returns 100 if in ideal range, decreasing towards 0 outside.
     */
    internal fun rangeScore(
        value: Double,
        min: Double,
        max: Double,
    ): Double {
        if (value in min..max) return 100.0
        val halfRange = (max - min) / 2
        val distance = if (value < min) min - value else value - max
        return (100.0 * (1.0 - (distance / halfRange).coerceAtMost(1.0))).coerceAtLeast(0.0)
    }

    /**
     * Score based on value exceeding a minimum threshold.
     */
    internal fun thresholdScore(
        value: Double,
        minExpected: Double,
        maxExpected: Double,
    ): Double {
        if (value < minExpected * 0.5) return 0.0
        if (value >= maxExpected) return 100.0
        return ((value - minExpected * 0.5) / (maxExpected - minExpected * 0.5) * 100.0).coerceIn(0.0, 100.0)
    }

    /**
     * Human typing shows slight fatigue (negative slope).
     * Perfectly flat or positive slope is suspicious.
     */
    internal fun fatigueScore(slope: Double): Double =
        when {
            slope < -2.0 -> 60.0
            slope < -0.1 -> 100.0
            slope < 0.1 -> 50.0
            else -> 20.0
        }

    /**
     * Human typing has burst-pause patterns (ratio 2-10).
     * Very high ratio means no pauses (mechanical).
     * Very low means too many pauses.
     */
    internal fun burstPauseScore(ratio: Double): Double =
        when {
            ratio in 2.0..10.0 -> 100.0
            ratio in 1.0..2.0 -> 70.0
            ratio in 10.0..20.0 -> 60.0
            ratio > 20.0 -> 20.0
            else -> 40.0
        }
}

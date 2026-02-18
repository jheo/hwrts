package com.humanwrites.domain.session

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

/**
 * Read-only Exposed table mapping for the keystroke_stats_5s continuous aggregate.
 * This is a TimescaleDB materialized view, not a regular table.
 */
object KeystrokeStatsView : Table("keystroke_stats_5s") {
    val sessionId = uuid("session_id")
    val bucket = timestamp("bucket")
    val keystrokeCount = integer("keystroke_count")
    val keydownCount = integer("keydown_count")
    val typingKeys = integer("typing_keys")
    val modifierKeys = integer("modifier_keys")
    val avgDwellTime = double("avg_dwell_time").nullable()
    val avgFlightTime = double("avg_flight_time").nullable()
    val minFlightTime = integer("min_flight_time").nullable()
    val maxFlightTime = integer("max_flight_time").nullable()
    val stddevFlightTime = double("stddev_flight_time").nullable()
    val windowStart = timestamp("window_start")
    val windowEnd = timestamp("window_end")
}

package com.humanwrites.domain.session

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

object KeystrokeEvents : Table("keystroke_events") {
    val id = long("id").autoIncrement()
    val sessionId = uuid("session_id")
    val eventType = varchar("event_type", 10)
    val keyCategory = varchar("key_category", 20)
    val timestampMs = long("timestamp_ms")
    val dwellTimeMs = integer("dwell_time_ms").nullable()
    val flightTimeMs = integer("flight_time_ms").nullable()
    val createdAt = timestamp("created_at")
}

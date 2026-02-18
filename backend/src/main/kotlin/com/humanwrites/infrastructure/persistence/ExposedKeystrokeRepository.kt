package com.humanwrites.infrastructure.persistence

import com.humanwrites.domain.session.KeystrokeEvents
import com.humanwrites.presentation.dto.request.KeystrokeEventDto
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.batchInsert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

data class KeystrokeEventRow(
    val id: Long,
    val sessionId: UUID,
    val eventType: String,
    val keyCategory: String,
    val timestampMs: Long,
    val dwellTimeMs: Int?,
    val flightTimeMs: Int?,
    val time: Instant,
)

interface KeystrokeRepository {
    fun batchInsert(
        sessionId: UUID,
        events: List<KeystrokeEventDto>,
    )

    fun findBySessionId(sessionId: UUID): List<KeystrokeEventRow>
}

@Repository
class ExposedKeystrokeRepository : KeystrokeRepository {
    override fun batchInsert(
        sessionId: UUID,
        events: List<KeystrokeEventDto>,
    ) {
        transaction {
            KeystrokeEvents.batchInsert(events) { event ->
                this[KeystrokeEvents.sessionId] = sessionId
                this[KeystrokeEvents.eventType] = event.eventType
                this[KeystrokeEvents.keyCategory] = event.keyCategory
                this[KeystrokeEvents.timestampMs] = event.timestampMs
                this[KeystrokeEvents.dwellTimeMs] = event.dwellTimeMs
                this[KeystrokeEvents.flightTimeMs] = event.flightTimeMs
                this[KeystrokeEvents.time] = Instant.now()
            }
        }
    }

    override fun findBySessionId(sessionId: UUID): List<KeystrokeEventRow> =
        transaction {
            KeystrokeEvents
                .selectAll()
                .where { KeystrokeEvents.sessionId eq sessionId }
                .orderBy(KeystrokeEvents.timestampMs)
                .map { it.toKeystrokeEventRow() }
        }

    private fun ResultRow.toKeystrokeEventRow() =
        KeystrokeEventRow(
            id = this[KeystrokeEvents.id],
            sessionId = this[KeystrokeEvents.sessionId],
            eventType = this[KeystrokeEvents.eventType],
            keyCategory = this[KeystrokeEvents.keyCategory],
            timestampMs = this[KeystrokeEvents.timestampMs],
            dwellTimeMs = this[KeystrokeEvents.dwellTimeMs],
            flightTimeMs = this[KeystrokeEvents.flightTimeMs],
            time = this[KeystrokeEvents.time],
        )
}

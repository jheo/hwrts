package com.humanwrites.domain.session

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

object WritingSessions : Table("writing_sessions") {
    val id = uuid("id")
    val documentId = uuid("document_id")
    val userId = uuid("user_id")
    val startedAt = timestamp("started_at")
    val endedAt = timestamp("ended_at").nullable()
    val totalKeystrokes = integer("total_keystrokes")
    val totalEdits = integer("total_edits")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

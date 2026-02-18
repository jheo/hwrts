package com.humanwrites.domain.ai

import com.humanwrites.domain.document.Documents
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object AiReviews : Table("ai_reviews") {
    val id = uuid("id").autoGenerate()
    val documentId = uuid("document_id").references(Documents.id)
    val reviewType = varchar("review_type", 20)
    val content = text("content") // JSONB stored as text
    val aiProvider = varchar("ai_provider", 20)
    val aiModel = varchar("ai_model", 50)
    val suggestionsCount = integer("suggestions_count").default(0)
    val acceptedCount = integer("accepted_count").default(0)
    val createdAt =
        timestampWithTimeZone("created_at")
            .defaultExpression(CurrentTimestampWithTimeZone)

    override val primaryKey = PrimaryKey(id)
}

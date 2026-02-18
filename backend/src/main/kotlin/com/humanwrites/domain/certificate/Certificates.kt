package com.humanwrites.domain.certificate

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object Certificates : Table("certificates") {
    val id = uuid("id").autoGenerate()
    val documentId = uuid("document_id")
    val userId = uuid("user_id")
    val shortHash = varchar("short_hash", 32)
    val version = varchar("version", 10)
    val overallScore = float("overall_score")
    val grade = varchar("grade", 20)
    val label = varchar("label", 100).nullable()
    val verificationData = text("verification_data") // JSONB stored as text
    val aiUsageData = text("ai_usage_data")
    val contentHash = varchar("content_hash", 64)
    val signature = text("signature")
    val status = varchar("status", 20)
    val issuedAt =
        timestampWithTimeZone("issued_at")
            .defaultExpression(CurrentTimestampWithTimeZone)
    val expiresAt = timestampWithTimeZone("expires_at").nullable()
    val createdAt =
        timestampWithTimeZone("created_at")
            .defaultExpression(CurrentTimestampWithTimeZone)
    val updatedAt =
        timestampWithTimeZone("updated_at")
            .defaultExpression(CurrentTimestampWithTimeZone)

    override val primaryKey = PrimaryKey(id)
}

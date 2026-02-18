package com.humanwrites.domain.document

import com.humanwrites.domain.user.Users
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object Documents : Table("documents") {
    val id = uuid("id").autoGenerate()
    val userId = uuid("user_id").references(Users.id)
    val title = varchar("title", 500).default("")
    val content = text("content").default("")
    val wordCount = integer("word_count").default(0)
    val status = varchar("status", 20).default("draft")
    val createdAt =
        timestampWithTimeZone("created_at")
            .defaultExpression(CurrentTimestampWithTimeZone)
    val updatedAt =
        timestampWithTimeZone("updated_at")
            .defaultExpression(CurrentTimestampWithTimeZone)

    override val primaryKey = PrimaryKey(id)
}

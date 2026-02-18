package com.humanwrites.domain.user

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object Users : Table("users") {
    val id = uuid("id").autoGenerate()
    val email = varchar("email", 255)
    val displayName = varchar("display_name", 100)
    val passwordHash = varchar("password_hash", 255).nullable()
    val avatarUrl = varchar("avatar_url", 500).nullable()
    val createdAt =
        timestampWithTimeZone("created_at")
            .defaultExpression(CurrentTimestampWithTimeZone)
    val updatedAt =
        timestampWithTimeZone("updated_at")
            .defaultExpression(CurrentTimestampWithTimeZone)

    override val primaryKey = PrimaryKey(id)
}

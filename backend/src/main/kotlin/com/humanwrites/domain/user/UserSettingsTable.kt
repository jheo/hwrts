package com.humanwrites.domain.user

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

object UserSettingsTable : Table("user_settings") {
    val id = uuid("id").autoGenerate()
    val userId = uuid("user_id").references(Users.id)
    val theme = varchar("theme", 20).default("system")
    val fontSize = integer("font_size").default(16)
    val editorWidth = varchar("editor_width", 20).default("medium")
    val autoSave = bool("auto_save").default(true)
    val focusMode = bool("focus_mode").default(false)
    val language = varchar("language", 10).default("ko")
    val createdAt =
        timestampWithTimeZone("created_at")
            .defaultExpression(CurrentTimestampWithTimeZone)
    val updatedAt =
        timestampWithTimeZone("updated_at")
            .defaultExpression(CurrentTimestampWithTimeZone)

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(userId)
    }
}

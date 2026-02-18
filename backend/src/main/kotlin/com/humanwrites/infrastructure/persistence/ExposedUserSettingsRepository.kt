package com.humanwrites.infrastructure.persistence

import com.humanwrites.domain.user.UserSettingsEntity
import com.humanwrites.domain.user.UserSettingsRepository
import com.humanwrites.domain.user.UserSettingsTable
import com.humanwrites.domain.user.UserSettingsUpdate
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ExposedUserSettingsRepository : UserSettingsRepository {
    override fun findByUserId(userId: UUID): UserSettingsEntity? =
        transaction {
            UserSettingsTable
                .selectAll()
                .where { UserSettingsTable.userId eq userId }
                .map { it.toUserSettingsEntity() }
                .singleOrNull()
        }

    override fun createDefault(userId: UUID): UserSettingsEntity =
        transaction {
            val insertStatement =
                UserSettingsTable.insert { row ->
                    row[UserSettingsTable.userId] = userId
                }
            insertStatement.resultedValues!!.first().toUserSettingsEntity()
        }

    override fun update(
        userId: UUID,
        settings: UserSettingsUpdate,
    ): UserSettingsEntity? =
        transaction {
            val updated =
                UserSettingsTable.update({ UserSettingsTable.userId eq userId }) { row ->
                    settings.theme?.let { row[theme] = it }
                    settings.fontSize?.let { row[fontSize] = it }
                    settings.editorWidth?.let { row[editorWidth] = it }
                    settings.autoSave?.let { row[autoSave] = it }
                    settings.focusMode?.let { row[focusMode] = it }
                    settings.language?.let { row[language] = it }
                    row[updatedAt] = CurrentTimestampWithTimeZone
                }
            if (updated == 0) return@transaction null
            findByUserId(userId)
        }

    private fun ResultRow.toUserSettingsEntity() =
        UserSettingsEntity(
            id = this[UserSettingsTable.id],
            userId = this[UserSettingsTable.userId],
            theme = this[UserSettingsTable.theme],
            fontSize = this[UserSettingsTable.fontSize],
            editorWidth = this[UserSettingsTable.editorWidth],
            autoSave = this[UserSettingsTable.autoSave],
            focusMode = this[UserSettingsTable.focusMode],
            language = this[UserSettingsTable.language],
            createdAt = this[UserSettingsTable.createdAt],
            updatedAt = this[UserSettingsTable.updatedAt],
        )
}

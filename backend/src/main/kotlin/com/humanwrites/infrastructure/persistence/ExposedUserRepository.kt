package com.humanwrites.infrastructure.persistence

import com.humanwrites.domain.user.UserEntity
import com.humanwrites.domain.user.UserRepository
import com.humanwrites.domain.user.Users
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ExposedUserRepository : UserRepository {
    override fun findById(id: UUID): UserEntity? =
        transaction {
            Users
                .selectAll()
                .where { Users.id eq id }
                .map { it.toUserEntity() }
                .singleOrNull()
        }

    override fun findByEmail(email: String): UserEntity? =
        transaction {
            Users
                .selectAll()
                .where { Users.email eq email }
                .map { it.toUserEntity() }
                .singleOrNull()
        }

    override fun create(
        email: String,
        displayName: String,
        passwordHash: String?,
        avatarUrl: String?,
    ): UserEntity =
        transaction {
            val insertStatement =
                Users.insert { row ->
                    row[Users.email] = email
                    row[Users.displayName] = displayName
                    if (passwordHash != null) row[Users.passwordHash] = passwordHash
                    if (avatarUrl != null) row[Users.avatarUrl] = avatarUrl
                }
            insertStatement.resultedValues!!.first().toUserEntity()
        }

    override fun update(
        id: UUID,
        displayName: String?,
        avatarUrl: String?,
    ): UserEntity? =
        transaction {
            val updated =
                Users.update({ Users.id eq id }) { row ->
                    if (displayName != null) row[Users.displayName] = displayName
                    if (avatarUrl != null) row[Users.avatarUrl] = avatarUrl
                    row[updatedAt] = CurrentTimestampWithTimeZone
                }
            if (updated == 0) return@transaction null
            findById(id)
        }

    override fun delete(id: UUID): Boolean =
        transaction {
            Users.deleteWhere { Users.id eq id } > 0
        }

    private fun ResultRow.toUserEntity() =
        UserEntity(
            id = this[Users.id],
            email = this[Users.email],
            displayName = this[Users.displayName],
            passwordHash = this[Users.passwordHash],
            avatarUrl = this[Users.avatarUrl],
            createdAt = this[Users.createdAt],
            updatedAt = this[Users.updatedAt],
        )
}

package com.humanwrites.domain.user

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone
import java.time.OffsetDateTime
import java.util.UUID

object OAuthAccounts : Table("oauth_accounts") {
    val id = uuid("id").autoGenerate()
    val userId = uuid("user_id").references(Users.id)
    val provider = varchar("provider", 50)
    val providerId = varchar("provider_id", 255)
    val providerEmail = varchar("provider_email", 255).nullable()
    val accessToken = text("access_token").nullable()
    val refreshToken = text("refresh_token").nullable()
    val tokenExpiresAt = timestampWithTimeZone("token_expires_at").nullable()
    val createdAt =
        timestampWithTimeZone("created_at")
            .defaultExpression(CurrentTimestampWithTimeZone)

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(provider, providerId)
    }
}

data class OAuthAccountEntity(
    val id: UUID,
    val userId: UUID,
    val provider: String,
    val providerId: String,
    val providerEmail: String?,
    val accessToken: String?,
    val refreshToken: String?,
    val tokenExpiresAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
)

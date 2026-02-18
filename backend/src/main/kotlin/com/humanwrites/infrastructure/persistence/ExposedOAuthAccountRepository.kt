package com.humanwrites.infrastructure.persistence

import com.humanwrites.domain.user.OAuthAccountEntity
import com.humanwrites.domain.user.OAuthAccountRepository
import com.humanwrites.domain.user.OAuthAccounts
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ExposedOAuthAccountRepository : OAuthAccountRepository {
    override fun findByProviderAndProviderId(
        provider: String,
        providerId: String,
    ): OAuthAccountEntity? =
        transaction {
            OAuthAccounts
                .selectAll()
                .where {
                    (OAuthAccounts.provider eq provider) and
                        (OAuthAccounts.providerId eq providerId)
                }.map { it.toOAuthAccountEntity() }
                .singleOrNull()
        }

    override fun findByUserId(userId: UUID): List<OAuthAccountEntity> =
        transaction {
            OAuthAccounts
                .selectAll()
                .where { OAuthAccounts.userId eq userId }
                .map { it.toOAuthAccountEntity() }
        }

    override fun create(
        userId: UUID,
        provider: String,
        providerId: String,
        providerEmail: String?,
        accessToken: String?,
        refreshToken: String?,
    ): OAuthAccountEntity =
        transaction {
            val insertStatement =
                OAuthAccounts.insert { row ->
                    row[OAuthAccounts.userId] = userId
                    row[OAuthAccounts.provider] = provider
                    row[OAuthAccounts.providerId] = providerId
                    if (providerEmail != null) row[OAuthAccounts.providerEmail] = providerEmail
                    if (accessToken != null) row[OAuthAccounts.accessToken] = accessToken
                    if (refreshToken != null) row[OAuthAccounts.refreshToken] = refreshToken
                }
            insertStatement.resultedValues!!.first().toOAuthAccountEntity()
        }

    private fun ResultRow.toOAuthAccountEntity() =
        OAuthAccountEntity(
            id = this[OAuthAccounts.id],
            userId = this[OAuthAccounts.userId],
            provider = this[OAuthAccounts.provider],
            providerId = this[OAuthAccounts.providerId],
            providerEmail = this[OAuthAccounts.providerEmail],
            accessToken = this[OAuthAccounts.accessToken],
            refreshToken = this[OAuthAccounts.refreshToken],
            tokenExpiresAt = this[OAuthAccounts.tokenExpiresAt],
            createdAt = this[OAuthAccounts.createdAt],
        )
}

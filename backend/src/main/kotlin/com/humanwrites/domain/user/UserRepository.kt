package com.humanwrites.domain.user

import java.util.UUID

interface UserRepository {
    fun findById(id: UUID): UserEntity?

    fun findByEmail(email: String): UserEntity?

    fun create(
        email: String,
        displayName: String,
        passwordHash: String? = null,
        avatarUrl: String? = null,
    ): UserEntity

    fun update(
        id: UUID,
        displayName: String? = null,
        avatarUrl: String? = null,
    ): UserEntity?

    fun delete(id: UUID): Boolean
}

interface OAuthAccountRepository {
    fun findByProviderAndProviderId(
        provider: String,
        providerId: String,
    ): OAuthAccountEntity?

    fun findByUserId(userId: UUID): List<OAuthAccountEntity>

    fun create(
        userId: UUID,
        provider: String,
        providerId: String,
        providerEmail: String? = null,
        accessToken: String? = null,
        refreshToken: String? = null,
    ): OAuthAccountEntity
}

interface UserSettingsRepository {
    fun findByUserId(userId: UUID): UserSettingsEntity?

    fun createDefault(userId: UUID): UserSettingsEntity

    fun update(
        userId: UUID,
        settings: UserSettingsUpdate,
    ): UserSettingsEntity?
}

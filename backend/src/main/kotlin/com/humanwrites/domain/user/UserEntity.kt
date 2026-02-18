package com.humanwrites.domain.user

import java.time.OffsetDateTime
import java.util.UUID

data class UserEntity(
    val id: UUID,
    val email: String,
    val displayName: String,
    val passwordHash: String?,
    val avatarUrl: String?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

data class UserSettingsEntity(
    val id: UUID,
    val userId: UUID,
    val theme: String,
    val fontSize: Int,
    val editorWidth: String,
    val autoSave: Boolean,
    val focusMode: Boolean,
    val language: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

data class UserSettingsUpdate(
    val theme: String? = null,
    val fontSize: Int? = null,
    val editorWidth: String? = null,
    val autoSave: Boolean? = null,
    val focusMode: Boolean? = null,
    val language: String? = null,
)

data class UserExportData(
    val user: UserEntity,
    val settings: UserSettingsEntity?,
    val oauthAccounts: List<OAuthAccountEntity>,
)

package com.humanwrites.domain.user

import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository,
    private val userSettingsRepository: UserSettingsRepository,
    private val oauthAccountRepository: OAuthAccountRepository,
) {
    fun findById(id: UUID): UserEntity? = userRepository.findById(id)

    fun findByEmail(email: String): UserEntity? = userRepository.findByEmail(email)

    fun register(
        email: String,
        displayName: String,
        passwordHash: String? = null,
    ): UserEntity =
        transaction {
            val user = userRepository.create(email, displayName, passwordHash)
            userSettingsRepository.createDefault(user.id)
            user
        }

    fun findOrCreateByOAuth(
        provider: String,
        providerId: String,
        email: String,
        displayName: String,
        avatarUrl: String?,
    ): UserEntity =
        transaction {
            val existing =
                oauthAccountRepository.findByProviderAndProviderId(provider, providerId)
            if (existing != null) {
                return@transaction userRepository.findById(existing.userId)
                    ?: throw IllegalStateException(
                        "User not found for OAuth account: ${existing.userId}",
                    )
            }

            val existingUser = userRepository.findByEmail(email)
            val user =
                existingUser ?: run {
                    val newUser =
                        userRepository.create(
                            email,
                            displayName,
                            avatarUrl = avatarUrl,
                        )
                    userSettingsRepository.createDefault(newUser.id)
                    newUser
                }

            oauthAccountRepository.create(
                userId = user.id,
                provider = provider,
                providerId = providerId,
                providerEmail = email,
            )

            user
        }

    fun getSettings(userId: UUID): UserSettingsEntity? = userSettingsRepository.findByUserId(userId)

    fun updateSettings(
        userId: UUID,
        update: UserSettingsUpdate,
    ): UserSettingsEntity? = userSettingsRepository.update(userId, update)

    fun deleteUser(userId: UUID): Boolean = userRepository.delete(userId)

    fun exportUserData(userId: UUID): UserExportData? {
        val user = userRepository.findById(userId) ?: return null
        val settings = userSettingsRepository.findByUserId(userId)
        val oauthAccounts = oauthAccountRepository.findByUserId(userId)
        return UserExportData(
            user = user,
            settings = settings,
            oauthAccounts = oauthAccounts,
        )
    }
}

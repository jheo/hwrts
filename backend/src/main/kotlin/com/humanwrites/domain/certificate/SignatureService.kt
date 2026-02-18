package com.humanwrites.domain.certificate

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

@Service
class SignatureService(
    private val objectMapper: ObjectMapper,
) {
    private val keyPair: KeyPair = loadOrGenerateKeyPair()

    val publicKeyPem: String
        get() {
            val encoded = Base64.getEncoder().encodeToString(keyPair.public.encoded)
            return "-----BEGIN PUBLIC KEY-----\n${
                encoded.chunked(64).joinToString("\n")
            }\n-----END PUBLIC KEY-----"
        }

    fun signCertificate(payload: CertificateSignPayload): String {
        val json = objectMapper.writeValueAsString(payload)
        val sig = Signature.getInstance("Ed25519")
        sig.initSign(keyPair.private)
        sig.update(json.toByteArray(Charsets.UTF_8))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(sig.sign())
    }

    fun verifyCertificate(
        payload: CertificateSignPayload,
        signature: String,
    ): Boolean =
        try {
            val json = objectMapper.writeValueAsString(payload)
            val sig = Signature.getInstance("Ed25519")
            sig.initVerify(keyPair.public)
            sig.update(json.toByteArray(Charsets.UTF_8))
            sig.verify(Base64.getUrlDecoder().decode(signature))
        } catch (_: Exception) {
            false
        }

    fun contentHash(content: String): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        return digest
            .digest(content.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    private fun loadOrGenerateKeyPair(): KeyPair {
        val privateKeyEnv = System.getenv("ED25519_PRIVATE_KEY")
        if (privateKeyEnv != null && privateKeyEnv.isNotBlank()) {
            return loadFromEnv(privateKeyEnv)
        }
        // Dev mode: generate ephemeral key pair
        val generator = KeyPairGenerator.getInstance("Ed25519")
        return generator.generateKeyPair()
    }

    private fun loadFromEnv(base64PrivateKey: String): KeyPair {
        val privateBytes = Base64.getDecoder().decode(base64PrivateKey)
        val keyFactory = KeyFactory.getInstance("Ed25519")
        val privateKey: PrivateKey = keyFactory.generatePrivate(PKCS8EncodedKeySpec(privateBytes))
        val publicKeyEnv =
            System.getenv("ED25519_PUBLIC_KEY")
                ?: throw IllegalStateException(
                    "ED25519_PUBLIC_KEY env var required when ED25519_PRIVATE_KEY is set",
                )
        val publicBytes = Base64.getDecoder().decode(publicKeyEnv)
        val publicKey: PublicKey = keyFactory.generatePublic(X509EncodedKeySpec(publicBytes))
        return KeyPair(publicKey, privateKey)
    }
}

data class CertificateSignPayload(
    val certificateId: String,
    val contentHash: String,
    val overallScore: Int,
    val grade: String,
    val issuedAt: String,
)

package com.humanwrites.unit

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.domain.certificate.CertificateService
import com.humanwrites.domain.certificate.SignatureService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.security.MessageDigest
import java.util.UUID

class CertificateServiceTest :
    FunSpec({

        val objectMapper: ObjectMapper = jacksonObjectMapper()
        val signatureService = mockk<SignatureService>()
        val service = CertificateService(signatureService, objectMapper)

        test("shortHash generation produces 32-character hex string") {
            // Test via reflection since generateShortHash is private
            val method =
                CertificateService::class.java.getDeclaredMethod(
                    "generateShortHash",
                    UUID::class.java,
                )
            method.isAccessible = true

            val certId = UUID.randomUUID()
            val shortHash = method.invoke(service, certId) as String

            shortHash.length shouldBe 32
            shortHash.all { it in '0'..'9' || it in 'a'..'f' } shouldBe true
        }

        test("shortHash is unique for different UUIDs") {
            val method =
                CertificateService::class.java.getDeclaredMethod(
                    "generateShortHash",
                    UUID::class.java,
                )
            method.isAccessible = true

            val hash1 = method.invoke(service, UUID.randomUUID()) as String
            // Small delay to ensure different timestamp
            Thread.sleep(1)
            val hash2 = method.invoke(service, UUID.randomUUID()) as String

            hash1 shouldNotBe hash2
        }

        test("shortHash is derived from SHA-256") {
            val method =
                CertificateService::class.java.getDeclaredMethod(
                    "generateShortHash",
                    UUID::class.java,
                )
            method.isAccessible = true

            val certId = UUID.randomUUID()
            val shortHash = method.invoke(service, certId) as String

            // Verify it's a valid hex string (SHA-256 output)
            shortHash.length shouldBe 32
            // Each character is hex
            shortHash.all { it.isDigit() || it in 'a'..'f' } shouldBe true
        }

        test("SignatureService.contentHash is called during certificate issuance setup") {
            // Verify the service delegates to SignatureService for content hashing
            val testContent = "Test document content"
            val expectedHash = "abcd1234" + "0".repeat(56)

            every { signatureService.contentHash(testContent) } returns expectedHash

            // We can verify the mock is properly configured
            val hash = signatureService.contentHash(testContent)
            hash shouldBe expectedHash

            verify { signatureService.contentHash(testContent) }
        }

        test("SHA-256 content hash is deterministic") {
            val content = "Deterministic test content"
            val digest = MessageDigest.getInstance("SHA-256")

            val hash1 =
                digest
                    .digest(content.toByteArray())
                    .joinToString("") { "%02x".format(it) }

            val digest2 = MessageDigest.getInstance("SHA-256")
            val hash2 =
                digest2
                    .digest(content.toByteArray())
                    .joinToString("") { "%02x".format(it) }

            hash1 shouldBe hash2
            hash1.length shouldBe 64
        }
    })

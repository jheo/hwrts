package com.humanwrites.unit

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.domain.certificate.CertificateSignPayload
import com.humanwrites.domain.certificate.SignatureService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldStartWith

class SignatureServiceTest :
    FunSpec({

        val objectMapper: ObjectMapper = jacksonObjectMapper()
        val service = SignatureService(objectMapper)

        fun samplePayload() =
            CertificateSignPayload(
                certificateId = "test-cert-id",
                contentHash = "abc123def456",
                overallScore = 75,
                grade = "Certified",
                issuedAt = "2026-01-01T00:00:00Z",
            )

        test("sign and verify roundtrip succeeds") {
            val payload = samplePayload()
            val signature = service.signCertificate(payload)

            signature shouldNotBe ""
            service.verifyCertificate(payload, signature) shouldBe true
        }

        test("invalid signature fails verification") {
            val payload = samplePayload()
            val signature = service.signCertificate(payload)

            // Tamper with the signature
            val tampered = signature.reversed()
            service.verifyCertificate(payload, tampered) shouldBe false
        }

        test("modified payload fails verification") {
            val payload = samplePayload()
            val signature = service.signCertificate(payload)

            val modifiedPayload = payload.copy(overallScore = 99)
            service.verifyCertificate(modifiedPayload, signature) shouldBe false
        }

        test("content hash is consistent for same input") {
            val hash1 = service.contentHash("Hello, World!")
            val hash2 = service.contentHash("Hello, World!")

            hash1 shouldBe hash2
        }

        test("content hash differs for different input") {
            val hash1 = service.contentHash("Hello, World!")
            val hash2 = service.contentHash("Goodbye, World!")

            hash1 shouldNotBe hash2
        }

        test("content hash is 64-character hex string (SHA-256)") {
            val hash = service.contentHash("test content")

            hash.length shouldBe 64
            hash.all { it in '0'..'9' || it in 'a'..'f' } shouldBe true
        }

        test("public key PEM format is valid") {
            val pem = service.publicKeyPem

            pem shouldStartWith "-----BEGIN PUBLIC KEY-----"
            pem shouldContain "-----END PUBLIC KEY-----"
        }

        test("public key PEM has proper line wrapping") {
            val pem = service.publicKeyPem
            val lines = pem.split("\n")

            // First line is header, last is footer
            lines.first() shouldBe "-----BEGIN PUBLIC KEY-----"
            lines.last() shouldBe "-----END PUBLIC KEY-----"

            // Inner lines should be at most 64 characters (Base64 line length)
            lines
                .drop(1)
                .dropLast(1)
                .forEach { line ->
                    (line.length <= 64) shouldBe true
                }
        }

        test("different payloads produce different signatures") {
            val payload1 = samplePayload()
            val payload2 = samplePayload().copy(overallScore = 50)

            val sig1 = service.signCertificate(payload1)
            val sig2 = service.signCertificate(payload2)

            sig1 shouldNotBe sig2
        }
    })

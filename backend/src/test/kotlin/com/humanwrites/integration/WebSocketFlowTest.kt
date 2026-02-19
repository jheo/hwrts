package com.humanwrites.integration

import com.humanwrites.domain.session.analysis.AnomalyDetector
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.infrastructure.persistence.KeystrokeRepository
import com.humanwrites.presentation.dto.request.KeystrokeBatchMessage
import com.humanwrites.presentation.dto.request.KeystrokeEventDto
import com.humanwrites.presentation.dto.request.SessionStartRequest
import com.humanwrites.presentation.dto.response.SessionStartResponse
import com.humanwrites.presentation.dto.response.SessionStatusMessage
import com.humanwrites.presentation.websocket.SessionWebSocketHandler
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.security.Principal
import java.util.UUID

/**
 * Integration tests for the WebSocket session flow.
 *
 * Tests the complete lifecycle: start session → send keystroke batches → end session.
 * Uses MockK to verify messaging interactions without a running WebSocket broker.
 */
class WebSocketFlowTest :
    FunSpec({

        // ── Fixtures ──────────────────────────────────────────────────────

        lateinit var messagingTemplate: SimpMessagingTemplate
        lateinit var keystrokeRepository: KeystrokeRepository
        lateinit var handler: SessionWebSocketHandler
        lateinit var userPrincipal: Principal
        lateinit var otherPrincipal: Principal

        beforeEach {
            messagingTemplate = mockk(relaxed = true)
            keystrokeRepository = mockk(relaxed = true)
            handler = SessionWebSocketHandler(messagingTemplate, keystrokeRepository, AnomalyDetector(KeystrokeAnalyzer()))
            userPrincipal = mockk()
            every { userPrincipal.name } returns "user-alice"
            otherPrincipal = mockk()
            every { otherPrincipal.name } returns "user-bob"
        }

        /** Start a session and return the assigned sessionId. */
        fun startSession(docId: UUID = UUID.randomUUID()): UUID {
            handler.handleSessionStart(SessionStartRequest(documentId = docId), userPrincipal)
            val slot = slot<SessionStartResponse>()
            verify(atLeast = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(slot),
                )
            }
            return slot.captured.sessionId
        }

        /** Build a keystroke batch for [sessionId] with [count] events. */
        fun makeBatch(
            sessionId: UUID,
            count: Int,
            baseTimeMs: Long = 1000L,
        ) = KeystrokeBatchMessage(
            sessionId = sessionId,
            events =
                (0 until count).map { i ->
                    KeystrokeEventDto(
                        eventType = "keydown",
                        keyCategory = "letter",
                        timestampMs = baseTimeMs + i * 100L,
                        dwellTimeMs = 75,
                        flightTimeMs = 120,
                    )
                },
        )

        // ── Full lifecycle ────────────────────────────────────────────────

        test("full flow: start → keystroke batches → end") {
            // 1. Start session
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            // 2. First batch of keystrokes
            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 10, baseTimeMs = 1000L), userPrincipal)

            val statusSlot1 = slot<SessionStatusMessage>()
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(statusSlot1),
                )
            }
            statusSlot1.captured.sessionId shouldBe sessionId
            statusSlot1.captured.status shouldBe "active"
            statusSlot1.captured.totalKeystrokes shouldBe 10

            // 3. Second batch
            clearMocks(messagingTemplate, answers = false)
            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 5, baseTimeMs = 2000L), userPrincipal)

            val statusSlot2 = slot<SessionStatusMessage>()
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(statusSlot2),
                )
            }
            statusSlot2.captured.totalKeystrokes shouldBe 15

            // 4. End session
            clearMocks(messagingTemplate, answers = false)
            handler.handleSessionEnd(sessionId, userPrincipal)

            val endSlot = slot<SessionStatusMessage>()
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(endSlot),
                )
            }
            endSlot.captured.sessionId shouldBe sessionId
            endSlot.captured.status shouldBe "ended"
            endSlot.captured.totalKeystrokes shouldBe 15
        }

        test("keystroke count accumulates across multiple batches") {
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            handler.handleKeystrokeBatch(makeBatch(sessionId, 3), userPrincipal)
            handler.handleKeystrokeBatch(makeBatch(sessionId, 7), userPrincipal)
            handler.handleKeystrokeBatch(makeBatch(sessionId, 5), userPrincipal)

            val capturedMessages = mutableListOf<SessionStatusMessage>()
            verify(exactly = 3) {
                messagingTemplate.convertAndSendToUser(any(), any(), capture(capturedMessages))
            }
            capturedMessages.last().totalKeystrokes shouldBe 15
        }

        // ── Ownership enforcement ────────────────────────────────────────

        test("wrong user cannot send keystrokes to another user's session") {
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            // Bob tries to send keystrokes to Alice's session
            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 5), otherPrincipal)

            // No status message should be sent
            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("wrong user cannot end another user's session") {
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            // Bob tries to end Alice's session
            handler.handleSessionEnd(sessionId, otherPrincipal)

            // No status message should be sent
            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }

            // Alice can still send keystrokes (session still active)
            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 3), userPrincipal)

            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(eq("user-alice"), any(), any())
            }
        }

        test("keystroke batch from owner succeeds after wrong-user attempt") {
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            // Bob's rejected attempt
            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 10), otherPrincipal)

            // Alice's valid batch — totalKeystrokes should still be 0 + 4 = 4 (Bob's was ignored)
            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 4), userPrincipal)

            val statusSlot = slot<SessionStatusMessage>()
            verify(atLeast = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    any(),
                    capture(statusSlot),
                )
            }
            statusSlot.captured.totalKeystrokes shouldBe 4
        }

        // ── Idempotent session end ────────────────────────────────────────

        test("duplicate session end is idempotent: second call is a no-op") {
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            handler.handleSessionEnd(sessionId, userPrincipal)

            val endSlot = slot<SessionStatusMessage>()
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(endSlot),
                )
            }
            endSlot.captured.status shouldBe "ended"

            // Second end call — session no longer exists, nothing should happen
            clearMocks(messagingTemplate, answers = false)
            handler.handleSessionEnd(sessionId, userPrincipal)

            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("keystrokes after session end are silently ignored") {
            val sessionId = startSession()
            handler.handleSessionEnd(sessionId, userPrincipal)
            clearMocks(messagingTemplate, answers = false)

            handler.handleKeystrokeBatch(makeBatch(sessionId, count = 5), userPrincipal)

            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        // ── Multiple concurrent sessions ──────────────────────────────────

        test("two concurrent sessions from same user are tracked independently") {
            val docId1 = UUID.randomUUID()
            val docId2 = UUID.randomUUID()

            handler.handleSessionStart(SessionStartRequest(documentId = docId1), userPrincipal)
            handler.handleSessionStart(SessionStartRequest(documentId = docId2), userPrincipal)

            // Capture both session IDs from start responses
            val startSlots = mutableListOf<SessionStartResponse>()
            verify(exactly = 2) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(startSlots),
                )
            }
            val sessionId1 = startSlots[0].sessionId
            val sessionId2 = startSlots[1].sessionId

            clearMocks(messagingTemplate, answers = false)

            handler.handleKeystrokeBatch(makeBatch(sessionId1, count = 7), userPrincipal)
            handler.handleKeystrokeBatch(makeBatch(sessionId2, count = 3), userPrincipal)

            val statusMessages = mutableListOf<SessionStatusMessage>()
            verify(exactly = 2) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(statusMessages),
                )
            }

            val s1Status = statusMessages.find { it.sessionId == sessionId1 }
            val s2Status = statusMessages.find { it.sessionId == sessionId2 }

            s1Status?.totalKeystrokes shouldBe 7
            s2Status?.totalKeystrokes shouldBe 3
        }

        test("ending one session does not affect sibling session") {
            val docId1 = UUID.randomUUID()
            val docId2 = UUID.randomUUID()

            handler.handleSessionStart(SessionStartRequest(documentId = docId1), userPrincipal)
            handler.handleSessionStart(SessionStartRequest(documentId = docId2), userPrincipal)

            val startSlots = mutableListOf<SessionStartResponse>()
            verify(exactly = 2) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(startSlots),
                )
            }
            val sessionId1 = startSlots[0].sessionId
            val sessionId2 = startSlots[1].sessionId

            clearMocks(messagingTemplate, answers = false)

            // End session 1
            handler.handleSessionEnd(sessionId1, userPrincipal)
            clearMocks(messagingTemplate, answers = false)

            // Session 2 should still accept keystrokes
            handler.handleKeystrokeBatch(makeBatch(sessionId2, count = 4), userPrincipal)

            val statusSlot = slot<SessionStatusMessage>()
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(statusSlot),
                )
            }
            statusSlot.captured.sessionId shouldBe sessionId2
            statusSlot.captured.status shouldBe "active"
        }

        // ── Edge cases ────────────────────────────────────────────────────

        test("keystroke batch with empty events list is silently ignored") {
            val sessionId = startSession()
            clearMocks(messagingTemplate, answers = false)

            val emptyBatch = KeystrokeBatchMessage(sessionId = sessionId, events = emptyList())
            handler.handleKeystrokeBatch(emptyBatch, userPrincipal)

            // Empty batch returns early after validation — no status message sent
            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("batch for unknown session is silently ignored") {
            val unknownSessionId = UUID.randomUUID()

            handler.handleKeystrokeBatch(makeBatch(unknownSessionId, count = 5), userPrincipal)

            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("session start response contains active status") {
            val docId = UUID.randomUUID()
            handler.handleSessionStart(SessionStartRequest(documentId = docId), userPrincipal)

            val slot = slot<SessionStartResponse>()
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-alice"),
                    eq("/queue/session.status"),
                    capture(slot),
                )
            }
            slot.captured.status shouldBe "active"
        }
    })

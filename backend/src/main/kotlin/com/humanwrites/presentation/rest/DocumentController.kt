package com.humanwrites.presentation.rest

import com.humanwrites.domain.document.DocumentEntity
import com.humanwrites.domain.document.DocumentService
import com.humanwrites.presentation.dto.request.DocumentCreateRequest
import com.humanwrites.presentation.dto.request.DocumentUpdateRequest
import com.humanwrites.presentation.dto.response.DocumentListResponse
import com.humanwrites.presentation.dto.response.DocumentResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/documents")
@Tag(name = "Documents", description = "문서 관리 API")
class DocumentController(
    private val documentService: DocumentService,
) {
    @GetMapping
    @Operation(summary = "문서 목록 조회", description = "현재 사용자의 문서 목록을 페이지네이션으로 조회")
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<DocumentListResponse> {
        val userId = currentUserId()
        val documents = documentService.findByUserId(userId, page, size)
        val totalCount = documentService.countByUserId(userId)

        return ResponseEntity.ok(
            DocumentListResponse(
                documents = documents.map { it.toResponse() },
                totalCount = totalCount,
                page = page,
                size = size,
            ),
        )
    }

    @PostMapping
    @Operation(summary = "문서 생성", description = "새 문서를 생성")
    fun create(
        @Valid @RequestBody req: DocumentCreateRequest,
    ): ResponseEntity<DocumentResponse> {
        val userId = currentUserId()
        val document = documentService.create(userId, req.title, req.content)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(document.toResponse())
    }

    @GetMapping("/{id}")
    @Operation(summary = "문서 조회", description = "ID로 문서를 조회 (소유자만 접근 가능)")
    fun get(
        @PathVariable id: UUID,
    ): ResponseEntity<DocumentResponse> {
        val userId = currentUserId()
        val document =
            documentService.findById(id)
                ?: return ResponseEntity.notFound().build()

        if (document.userId != userId) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        return ResponseEntity.ok(document.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "문서 수정", description = "문서의 제목, 내용, 단어 수를 수정")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody req: DocumentUpdateRequest,
    ): ResponseEntity<DocumentResponse> {
        val userId = currentUserId()
        val document =
            documentService.update(id, userId, req.title, req.content, req.wordCount)
                ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(document.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "문서 삭제", description = "문서를 삭제 (소유자만 가능)")
    fun delete(
        @PathVariable id: UUID,
    ): ResponseEntity<Void> {
        val userId = currentUserId()
        val deleted = documentService.delete(id, userId)

        return if (deleted) {
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }

    private fun currentUserId(): UUID = SecurityContextHolder.getContext().authentication.principal as UUID

    private fun DocumentEntity.toResponse() =
        DocumentResponse(
            id = id.toString(),
            title = title,
            content = content,
            wordCount = wordCount,
            status = status,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
}

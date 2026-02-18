package com.humanwrites.domain.document

import org.springframework.stereotype.Service
import java.util.UUID

@Service
class DocumentService(
    private val documentRepository: DocumentRepository,
) {
    fun findById(id: UUID): DocumentEntity? = documentRepository.findById(id)

    fun findById(
        id: UUID,
        userId: UUID,
    ): DocumentEntity? {
        val document = documentRepository.findById(id) ?: return null
        if (document.userId != userId) return null
        return document
    }

    fun findByUserId(
        userId: UUID,
        page: Int = 0,
        size: Int = 20,
    ): List<DocumentEntity> {
        val offset = page.toLong() * size
        return documentRepository.findByUserId(userId, offset, size)
    }

    fun countByUserId(userId: UUID): Long = documentRepository.countByUserId(userId)

    fun create(
        userId: UUID,
        title: String = "",
        content: String = "",
    ): DocumentEntity = documentRepository.create(userId, title, content)

    fun update(
        id: UUID,
        userId: UUID,
        title: String? = null,
        content: String? = null,
        wordCount: Int? = null,
        status: String? = null,
    ): DocumentEntity? {
        val existing = documentRepository.findById(id) ?: return null
        if (existing.userId != userId) return null
        return documentRepository.update(
            id = id,
            title = title,
            content = content,
            wordCount = wordCount,
            status = status,
        )
    }

    fun delete(
        id: UUID,
        userId: UUID,
    ): Boolean {
        val existing = documentRepository.findById(id) ?: return false
        if (existing.userId != userId) return false
        return documentRepository.delete(id)
    }
}

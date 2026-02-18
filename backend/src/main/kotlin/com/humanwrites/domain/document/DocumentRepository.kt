package com.humanwrites.domain.document

import java.util.UUID

interface DocumentRepository {
    fun findById(id: UUID): DocumentEntity?

    fun findByUserId(
        userId: UUID,
        offset: Long = 0,
        limit: Int = 20,
    ): List<DocumentEntity>

    fun countByUserId(userId: UUID): Long

    fun create(
        userId: UUID,
        title: String = "",
        content: String = "",
    ): DocumentEntity

    fun update(
        id: UUID,
        title: String? = null,
        content: String? = null,
        wordCount: Int? = null,
        status: String? = null,
    ): DocumentEntity?

    fun delete(id: UUID): Boolean
}

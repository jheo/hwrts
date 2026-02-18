package com.humanwrites.domain.document

import java.time.OffsetDateTime
import java.util.UUID

data class DocumentEntity(
    val id: UUID,
    val userId: UUID,
    val title: String,
    val content: String,
    val wordCount: Int,
    val status: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

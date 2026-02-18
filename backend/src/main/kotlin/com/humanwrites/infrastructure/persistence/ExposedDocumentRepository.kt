package com.humanwrites.infrastructure.persistence

import com.humanwrites.domain.document.DocumentEntity
import com.humanwrites.domain.document.DocumentRepository
import com.humanwrites.domain.document.Documents
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.javatime.CurrentTimestampWithTimeZone
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ExposedDocumentRepository : DocumentRepository {
    override fun findById(id: UUID): DocumentEntity? =
        transaction {
            Documents
                .selectAll()
                .where { Documents.id eq id }
                .map { it.toDocumentEntity() }
                .singleOrNull()
        }

    override fun findByUserId(
        userId: UUID,
        offset: Long,
        limit: Int,
    ): List<DocumentEntity> =
        transaction {
            Documents
                .selectAll()
                .where { Documents.userId eq userId }
                .orderBy(Documents.updatedAt, SortOrder.DESC)
                .limit(limit)
                .offset(offset)
                .map { it.toDocumentEntity() }
        }

    override fun countByUserId(userId: UUID): Long =
        transaction {
            Documents
                .selectAll()
                .where { Documents.userId eq userId }
                .count()
        }

    override fun create(
        userId: UUID,
        title: String,
        content: String,
    ): DocumentEntity =
        transaction {
            val insertStatement =
                Documents.insert { row ->
                    row[Documents.userId] = userId
                    row[Documents.title] = title
                    row[Documents.content] = content
                }
            insertStatement.resultedValues!!.first().toDocumentEntity()
        }

    override fun update(
        id: UUID,
        title: String?,
        content: String?,
        wordCount: Int?,
        status: String?,
    ): DocumentEntity? =
        transaction {
            val updated =
                Documents.update({ Documents.id eq id }) { row ->
                    title?.let { row[Documents.title] = it }
                    content?.let { row[Documents.content] = it }
                    wordCount?.let { row[Documents.wordCount] = it }
                    status?.let { row[Documents.status] = it }
                    row[updatedAt] = CurrentTimestampWithTimeZone
                }
            if (updated == 0) return@transaction null
            findById(id)
        }

    override fun delete(id: UUID): Boolean =
        transaction {
            Documents.deleteWhere { Documents.id eq id } > 0
        }

    private fun ResultRow.toDocumentEntity() =
        DocumentEntity(
            id = this[Documents.id],
            userId = this[Documents.userId],
            title = this[Documents.title],
            content = this[Documents.content],
            wordCount = this[Documents.wordCount],
            status = this[Documents.status],
            createdAt = this[Documents.createdAt],
            updatedAt = this[Documents.updatedAt],
        )
}

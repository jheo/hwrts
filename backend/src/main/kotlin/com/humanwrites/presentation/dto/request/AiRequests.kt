package com.humanwrites.presentation.dto.request

data class SpellingRequest(
    val text: String,
    val locale: String,
    val documentId: String,
)

data class AcceptSuggestionsRequest(
    val documentId: String,
    val count: Int,
)

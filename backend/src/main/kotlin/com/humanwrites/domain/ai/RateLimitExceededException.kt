package com.humanwrites.domain.ai

class RateLimitExceededException(
    message: String = "Rate limit exceeded. Please try again later.",
) : RuntimeException(message)

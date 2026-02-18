package com.humanwrites.domain.ai

import com.humanwrites.config.AiConfig
import org.springframework.stereotype.Service

@Service
class ProviderRouter(
    providers: List<AiProvider>,
    private val aiConfig: AiConfig,
) {
    private val providerMap: Map<String, AiProvider> =
        providers.associateBy { it.providerName }

    fun getProvider(providerName: String): AiProvider =
        providerMap[providerName]
            ?: throw IllegalArgumentException(
                "AI provider '$providerName' not found. Available: ${providerMap.keys}",
            )

    fun getDefaultProvider(): AiProvider {
        val defaultName = aiConfig.defaultProvider
        return providerMap[defaultName]
            ?: providerMap.values.firstOrNull()
            ?: throw IllegalStateException("No AI providers configured")
    }
}

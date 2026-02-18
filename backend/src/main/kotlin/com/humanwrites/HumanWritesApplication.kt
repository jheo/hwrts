package com.humanwrites

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class HumanWritesApplication

fun main(args: Array<String>) {
    runApplication<HumanWritesApplication>(*args)
}

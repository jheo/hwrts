package com.humanwrites

import io.kotest.core.spec.style.DescribeSpec
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
class HumanWritesApplicationTest :
    DescribeSpec({

        describe("Application Context") {
            it("loads successfully") {
                // Spring context loads without errors
            }
        }
    })

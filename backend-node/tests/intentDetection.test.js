/**
 * Test script for OpenAI intent detection functionality
 *
 * This script tests the intent detection service by sending various messages
 * and verifying the responses match expected intents.
 */
import dotenv from "dotenv";
import {
  detectIntent,
  COMMAND_STRINGS,
} from "../src/services/intentDetectionService.js";

// Load environment variables
dotenv.config();

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY not found in environment variables");
  console.error(
    "Please set the OPENAI_API_KEY environment variable and try again"
  );
  process.exit(1);
}

// Test messages with expected intents
const testCases = [
  {
    message: "What are your business hours?",
    expectedIntent: COMMAND_STRINGS.BUILD_SQL,
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "Tell me about your services",
    expectedIntent: COMMAND_STRINGS.GENERATE_EMBEDDINGS,
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "I want to book an appointment",
    expectedIntent: COMMAND_STRINGS.SUGGEST_WHATSAPP_FLOW,
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "What is your return policy?",
    expectedIntent: COMMAND_STRINGS.FETCH_FAQ,
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "DROP TABLE users;",
    expectedIntent: COMMAND_STRINGS.POTENTIAL_SECURITY_THREAT,
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "What is the capital of France?",
    expectedIntent: COMMAND_STRINGS.IRRELEVANT_QUERY,
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "hmm",
    expectedIntent: COMMAND_STRINGS.UNCLEAR_QUERY,
    businessContext: { businessId: "test_business_123" },
  },
];

/**
 * Run the intent detection tests
 */
async function runTests() {
  console.log("Starting OpenAI Intent Detection Tests...\n");

  let passCount = 0;
  let failCount = 0;

  for (const [index, testCase] of testCases.entries()) {
    try {
      console.log(
        `Test ${index + 1}/${testCases.length}: "${testCase.message}"`
      );
      console.log(`Expected intent: ${testCase.expectedIntent}`);

      // Call the intent detection service
      const startTime = Date.now();
      const detectedIntent = await detectIntent(
        testCase.message,
        testCase.businessContext
      );
      const duration = Date.now() - startTime;

      console.log(`Detected intent: ${detectedIntent}`);
      console.log(`Response time: ${duration}ms`);

      // Check if the detected intent matches the expected intent
      if (detectedIntent === testCase.expectedIntent) {
        console.log("✅ PASS\n");
        passCount++;
      } else {
        console.log("❌ FAIL - Intent mismatch\n");
        failCount++;
      }
    } catch (error) {
      console.error(`❌ FAIL - Error: ${error.message}\n`);
      failCount++;
    }
  }

  // Print summary
  console.log("=== Test Summary ===");
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(
    `Success rate: ${Math.round((passCount / testCases.length) * 100)}%`
  );

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error("Test execution failed:", error);
  process.exit(1);
});

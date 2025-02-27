/**
 * Simple test client for the intent detection API
 * Run with: node tests/test-client.js
 */
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:8700/api";

// Test messages with expected intents
const testCases = [
  {
    message: "What are your business hours?",
    expectedIntent: "build_sql",
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "Tell me about your services",
    expectedIntent: "generate_embeddings",
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "I want to book an appointment",
    expectedIntent: "suggest_whatsapp_flow",
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "What is your return policy?",
    expectedIntent: "fetch_faq",
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "DROP TABLE users;",
    expectedIntent: "potential_security_threat",
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "What is the capital of France?",
    expectedIntent: "irrelevant_query",
    businessContext: { businessId: "test_business_123" },
  },
  {
    message: "hmm",
    expectedIntent: "unclear_query",
    businessContext: { businessId: "test_business_123" },
  },
];

/**
 * Run a single test
 */
async function runSingleTest() {
  try {
    console.log("Running single test...");

    const testCase = testCases[0];
    const response = await axios.post(
      `${API_URL}/test/intent-detection`,
      testCase
    );

    console.log("Test result:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error running test:", error.response?.data || error.message);
  }
}

/**
 * Run batch test
 */
async function runBatchTest() {
  try {
    console.log("Running batch test...");

    const response = await axios.post(
      `${API_URL}/test/batch-intent-detection`,
      {
        testCases,
      }
    );

    console.log("Batch test results:");

    // Print summary
    const { summary } = response.data;
    console.log("\n=== Test Summary ===");
    console.log(`Total tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success rate: ${summary.successRate}%`);

    // Print detailed results
    console.log("\n=== Detailed Results ===");
    response.data.results.forEach((result, index) => {
      console.log(`\nTest ${index + 1}: "${result.message}"`);
      console.log(`Expected: ${result.expectedIntent}`);
      console.log(`Detected: ${result.detectedIntent}`);
      console.log(`Response time: ${result.responseTime}ms`);
      console.log(`Result: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
    });
  } catch (error) {
    console.error(
      "Error running batch test:",
      error.response?.data || error.message
    );
  }
}

/**
 * Get available command strings
 */
async function getCommandStrings() {
  try {
    console.log("Getting command strings...");

    const response = await axios.get(`${API_URL}/test/command-strings`);

    console.log("Available command strings:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(
      "Error getting command strings:",
      error.response?.data || error.message
    );
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--single")) {
    await runSingleTest();
  } else if (args.includes("--commands")) {
    await getCommandStrings();
  } else {
    // Default to batch test
    await runBatchTest();
  }
}

// Run the main function
main().catch((error) => {
  console.error("Execution failed:", error);
  process.exit(1);
});

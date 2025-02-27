import dotenv from "dotenv";
import {
  getSqlQueryResult,
  runTest,
  seedTestData,
} from "../src/services/sqlQueryService.js";
import logger from "../src/utils/logger.js";

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

const queryTest = async () => {
  try {
    console.log("=== Testing SQL Query Service ===");

    // Seed test data if needed
    await seedTestData();
    console.log("Test data verified/seeded");

    // Test a single specific question
    const question = "What are your business hours?";
    console.log(`\nTesting specific question: "${question}"`);

    const startTime = Date.now();
    const response = await getSqlQueryResult(question);
    const duration = Date.now() - startTime;

    console.log(`Response (${duration}ms):`);
    console.log(response);
    console.log("\n");

    // Run a batch of test questions
    console.log("Running batch test with multiple questions:");
    const testQuestions = [
      "How many businesses do you have in the system?",
      "What services do you offer?",
      "When are you open on weekends?",
      "Is your business open on Mondays?",
      "What are your hours on Saturday and Sunday?",
      "Tell me about your AI services",
    ];

    const batchResults = await runTest(testQuestions);

    console.log("\n=== Batch Test Results ===");
    batchResults.forEach((result, index) => {
      console.log(`\nTest ${index + 1}: "${result.question}"`);
      if (result.success) {
        console.log(`Response: ${result.response}`);
      } else {
        console.log(`Error: ${result.error}`);
      }
    });

    console.log("\n=== Test Summary ===");
    const successCount = batchResults.filter((r) => r.success).length;
    console.log(`Total tests: ${batchResults.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${batchResults.length - successCount}`);
    console.log(
      `Success rate: ${Math.round((successCount / batchResults.length) * 100)}%`
    );

    console.log("\nSQL Query Service test completed successfully");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
};

// Run the test
queryTest().catch((error) => {
  console.error("Unhandled error in test:", error);
  process.exit(1);
});

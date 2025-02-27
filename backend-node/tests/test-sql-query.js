import dotenv from "dotenv";
import { getSqlQueryResult, runTest } from "../src/services/sqlQueryService.js";
import { detectIntent } from "../src/services/intentDetectionService.js";
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
    console.log("=== Testing SQL Query Service with Intent Detection ===");

    // Test a single specific question
    const question = "What are your business hours?";
    console.log(`\nTesting specific question: "${question}"`);

    // First detect intent and relevant tables
    console.log("Step 1: Detecting intent and relevant tables...");
    const intentResult = await detectIntent(question, {
      businessId: "test_business",
    });
    console.log(`Detected intent: ${intentResult.intent}`);
    console.log(
      `Relevant tables: ${intentResult.relevantTables?.join(", ") || "none"}`
    );

    // Then use the SQL query service with the detected tables
    console.log("\nStep 2: Generating SQL query and response...");
    const startTime = Date.now();
    const response = await getSqlQueryResult(
      question,
      intentResult.relevantTables || ["business_hours"]
    );
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

    console.log("\n=== Batch Test Results ===");

    for (let i = 0; i < testQuestions.length; i++) {
      const testQuestion = testQuestions[i];
      console.log(`\nTest ${i + 1}: "${testQuestion}"`);

      try {
        // First detect intent and relevant tables
        console.log("Detecting intent...");
        const intentResult = await detectIntent(testQuestion, {
          businessId: "test_business",
        });
        console.log(`Intent: ${intentResult.intent}`);
        console.log(
          `Tables: ${intentResult.relevantTables?.join(", ") || "none"}`
        );

        // Then generate SQL response
        console.log("Generating SQL response...");
        const response = await getSqlQueryResult(
          testQuestion,
          intentResult.relevantTables
        );
        console.log(`Response: ${response}`);
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
    }

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

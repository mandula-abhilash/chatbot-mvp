import {
  getSqlQueryResult,
  closeConnection,
} from "../src/services/sqlQueryService.js";

const queryTest = async () => {
  try {
    const question = "What are your store timings?";
    console.log(`\nTesting specific question: ${question}`);
    const response = await getSqlQueryResult(question);
    console.log("Response:", response);
    await closeConnection();
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
};

await queryTest();

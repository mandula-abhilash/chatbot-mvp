import dotenv from "dotenv";
import { OpenAI } from "openai";
import logger from "../utils/logger.js";
import db from "../config/db.js";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the query template for SQL generation with more explicit schema information
const queryTemplate = `Given an input question, create a syntactically correct PostgreSQL query to run.
Return ONLY the SQL query without any additional text.
Be smart about the type of query needed based on the question.

Possible strategies:
- Use COUNT(*) to count matching rows
- Use SELECT * to fetch full details
- Use appropriate WHERE clauses to filter

IMPORTANT: Use ONLY the following table(s) and their exact column names:

{table_info}

CRITICAL NOTES:
- For business_services table, use "is_active" to check if a service is currently offered
- Always use the exact column names as provided in the schema
- Limit the results to {top_k} rows
- Log the exact SQL query you generate

Question: {input}`;

// Define the response template for formatting results
const responseTemplate = `Analyze the SQL query result and provide a clear, concise response to the original question.

Original Question: {input}
SQL Query: {sql_query}
SQL Query Result: {sql_result}

Strategies for response:
- If result is a count, summarize the number
- If result is full rows, describe the details
- Use natural language and be informative
- Be concise and direct
- Format any dates or times in a human-readable way
- If there was an error, explain what information was being looked for

Your response should directly address the question and provide meaningful insights.`;

// Function to get detailed table schema information
async function getTableInfo(tableName) {
  try {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    const result = await db.raw(query, [tableName]);

    if (result.rows.length === 0) {
      logger.warn(`No columns found for table ${tableName}`);
      return `No columns found for table ${tableName}`;
    }

    return (
      `Table ${tableName} has the following columns:\n` +
      result.rows
        .map((row) => {
          const nullable = row.is_nullable === "YES" ? "nullable" : "not null";
          const defaultVal = row.column_default
            ? `default: ${row.column_default}`
            : "";
          return `- ${row.column_name} (${row.data_type}, ${nullable}${
            defaultVal ? ", " + defaultVal : ""
          })`;
        })
        .join("\n")
    );
  } catch (error) {
    logger.error(`Error getting table info for ${tableName}:`, error);
    return `Error fetching schema for ${tableName}: ${error.message}`;
  }
}

// Function to extract just the SQL query
function extractSqlQuery(llmOutput) {
  logger.debug(`Extracting SQL query from LLM output: ${llmOutput}`);

  // Remove any code block markers
  const cleanOutput = llmOutput.replace(/```sql|```/g, "").trim();

  // Try to extract query using regex for SELECT statements
  const selectMatch = cleanOutput.match(/SELECT[\s\S]*?;/i);
  if (selectMatch) {
    return selectMatch[0];
  }

  // Try for other SQL statements (INSERT, UPDATE, etc.)
  const otherMatch = cleanOutput.match(
    /(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?;/i
  );
  if (otherMatch) {
    return otherMatch[0];
  }

  // If no match, return the entire cleaned output
  logger.warn("Could not extract SQL query with regex, using full output");
  return cleanOutput;
}

// Main function to process a question and generate a response
export async function getSqlQueryResult(
  question,
  suggestedTables = [],
  topK = 5
) {
  try {
    logger.info(`Processing SQL query for question: "${question}"`);
    logger.info(`Suggested tables: ${suggestedTables.join(", ") || "none"}`);

    // Default tables if none provided
    const tablesToUse =
      suggestedTables.length > 0
        ? suggestedTables
        : [
            "businesses",
            "business_hours",
            "business_services",
            "business_faqs",
          ];

    // Get the table schema information for all requested tables
    const tableSchemaPromises = tablesToUse.map((tableName) =>
      getTableInfo(tableName)
    );
    const tableSchemas = await Promise.all(tableSchemaPromises);
    const combinedTableSchema = tableSchemas.join("\n\n");

    // Generate the SQL query using OpenAI
    const queryPrompt = queryTemplate
      .replace("{input}", question)
      .replace("{table_info}", combinedTableSchema)
      .replace("{top_k}", topK);

    logger.debug(`Sending prompt to OpenAI: ${queryPrompt}`);

    const queryCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: queryPrompt }],
      temperature: 0,
      max_tokens: 500,
    });

    const generatedQuery = queryCompletion.choices[0].message.content;
    const cleanQuery = extractSqlQuery(generatedQuery);

    logger.info(`Generated SQL Query: ${cleanQuery}`);

    // Execute the SQL query with proper error handling
    let queryResult;
    try {
      queryResult = await db.raw(cleanQuery);
      logger.info(
        `SQL query executed successfully with ${queryResult.rows.length} results`
      );
    } catch (sqlError) {
      logger.error(`SQL execution error: ${sqlError.message}`);

      // Try to provide a more helpful error message
      let errorMessage = `I encountered an error while trying to find that information: ${cleanQuery} - ${sqlError.message}`;

      // Add context about what we were trying to do
      if (
        question.toLowerCase().includes("weekend") ||
        question.toLowerCase().includes("saturday") ||
        question.toLowerCase().includes("sunday")
      ) {
        errorMessage +=
          "\n\nI was trying to find information about our weekend hours.";
      } else if (question.toLowerCase().includes("monday")) {
        errorMessage +=
          "\n\nI was trying to find information about our Monday hours.";
      }

      return errorMessage;
    }

    // Format the result based on the query type
    let resultStr;
    if (cleanQuery.toLowerCase().includes("count(")) {
      // Count query
      resultStr =
        queryResult.rows.length > 0
          ? queryResult.rows[0].count.toString()
          : "0";
    } else if (queryResult.rows.length === 0) {
      // No results
      return "I couldn't find any information matching your query.";
    } else {
      // Full details query
      resultStr = JSON.stringify(queryResult.rows, null, 2);
    }

    // Generate a human-readable response using OpenAI
    const responsePrompt = responseTemplate
      .replace("{input}", question)
      .replace("{sql_query}", cleanQuery)
      .replace("{sql_result}", resultStr);

    logger.debug(`Sending result prompt to OpenAI: ${responsePrompt}`);

    const responseCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: responsePrompt }],
      temperature: 0.2,
      max_tokens: 300,
    });

    const finalResponse = responseCompletion.choices[0].message.content;
    logger.info(`Generated final response for question: "${question}"`);

    return finalResponse;
  } catch (error) {
    logger.error(`Error in getSqlQueryResult: ${error.message}`, error);
    return `I'm sorry, I encountered an error while processing your request: ${error.message}`;
  }
}

// Main function for testing
export async function runTest(questions = []) {
  const testQuestions =
    questions.length > 0
      ? questions
      : [
          "How many businesses are registered in the system?",
          "What are the business hours for Visdak?",
          "List all services offered by businesses",
          "What services are available on weekends?",
        ];

  logger.info("Starting SQL Query Chain Test");

  const results = [];
  for (const question of testQuestions) {
    logger.info(`Testing question: ${question}`);
    try {
      const response = await getSqlQueryResult(question);
      logger.info(`Response: ${response}`);
      results.push({ question, response, success: true });
    } catch (error) {
      logger.error(`Error processing question "${question}":`, error);
      results.push({ question, error: error.message, success: false });
    }
  }

  logger.info("Test completed");
  return results;
}

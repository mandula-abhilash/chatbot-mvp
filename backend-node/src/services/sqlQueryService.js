// index.mjs
import dotenv from "dotenv";
import pg from "pg";
import { OpenAI } from "openai";
import fs from "fs";

dotenv.config();

const { Pool } = pg;

// Load database credentials from environment variables
const PG_HOST = process.env.PG_HOST;
const PG_PORT = process.env.PG_PORT;
const PG_USER = process.env.PG_USER;
const PG_PASSWORD = process.env.PG_PASSWORD;
const PG_DATABASE = process.env.PG_DATABASE;

// Create PostgreSQL connection pool
const pool = new Pool({
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the query template for SQL generation
const queryTemplate = `Given an input question, create a syntactically correct PostgreSQL query to run.
Return ONLY the SQL query without any additional text.
Be smart about the type of query needed based on the question.

Possible strategies:
- Use COUNT(*) to count matching rows
- Use SELECT * to fetch full details
- Use appropriate WHERE clauses to filter

Only use the following tables:
{table_info}

Limit the results to {top_k} rows.

Question: {input}`;

// Define the response template for formatting results
const responseTemplate = `Analyze the SQL query result and provide a clear, concise response to the original question.

Original Question: {input}
SQL Query Result: {sql_result}

Strategies for response:
- If result is a count, summarize the number
- If result is full rows, describe the details
- Use natural language and be informative

Your response should directly address the question and provide meaningful insights.`;

// Function to get table schema information
async function getTableInfo(tableName) {
  try {
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `;
    const result = await pool.query(query, [tableName]);

    if (result.rows.length === 0) {
      return `No columns found for table ${tableName}`;
    }

    return (
      `Table ${tableName} has the following columns:\n` +
      result.rows
        .map((row) => `- ${row.column_name} (${row.data_type})`)
        .join("\n")
    );
  } catch (error) {
    console.error("Error getting table info:", error);
    return `Error fetching schema for ${tableName}`;
  }
}

// Function to extract just the SQL query
function extractSqlQuery(llmOutput) {
  // Remove any code block markers
  const cleanOutput = llmOutput.replace(/```sql|```/g, "").trim();

  // Try to extract query using regex
  const match = cleanOutput.match(/SELECT.*?;/is);
  if (match) {
    return match[0];
  }

  // If no match, return the entire cleaned output
  return cleanOutput;
}

// Main function to process a question and generate a response
export async function getSqlQueryResult(
  question,
  tableInfo = "tasks",
  topK = 5
) {
  try {
    // Get the table schema information
    const tableSchema = await getTableInfo(tableInfo);

    // Generate the SQL query using OpenAI
    const queryPrompt = queryTemplate
      .replace("{input}", question)
      .replace("{table_info}", tableSchema)
      .replace("{top_k}", topK);

    const queryCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: queryPrompt }],
      temperature: 0,
    });

    const generatedQuery = queryCompletion.choices[0].message.content;
    const cleanQuery = extractSqlQuery(generatedQuery);

    console.log(`Generated SQL Query:\n${cleanQuery}\n`);

    // Execute the SQL query
    const queryResult = await pool.query(cleanQuery);

    // Format the result based on the query type
    let resultStr;
    if (cleanQuery.toLowerCase().includes("count(")) {
      // Count query
      resultStr =
        queryResult.rows.length > 0
          ? queryResult.rows[0].count.toString()
          : "0";
    } else if (cleanQuery.includes("*")) {
      // Full details query
      resultStr = queryResult.rows.map((row) => JSON.stringify(row)).join("\n");
    } else {
      // Generic fallback
      resultStr = queryResult.rows
        .map((row) => Object.values(row)[0])
        .join(", ");
    }

    // Generate a human-readable response using OpenAI
    const responsePrompt = responseTemplate
      .replace("{input}", question)
      .replace("{sql_result}", resultStr);

    const responseCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: responsePrompt }],
      temperature: 0.2,
    });

    return responseCompletion.choices[0].message.content;
  } catch (error) {
    return `Error processing the query: ${error.message}`;
  }
}

// Function to close the database connection
export async function closeConnection() {
  await pool.end();
  console.log("Database connection closed");
}

// Main function for testing
export async function runTest() {
  const questions = [
    "How many documentation tasks are there in total?",
    "Are there any memory leak issue related tasks?",
    "List memory leak related tasks",
    "List some high priority tasks which are very critical and I must do now",
  ];

  console.log("Starting SQL Query Chain Test");

  for (const question of questions) {
    console.log(`\nQuestion: ${question}`);
    try {
      const response = await getSqlQueryResult(question);
      console.log("Response:", response);
    } catch (error) {
      console.error(`Error processing question "${question}":`, error);
    }
  }

  console.log("\nTest completed successfully");

  // Close the database connection
  await closeConnection();
}

// If this file is executed directly (not imported)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log("Running as standalone script");
  runTest().catch((error) => {
    console.error("Error in main function:", error);
    process.exit(1);
  });
}

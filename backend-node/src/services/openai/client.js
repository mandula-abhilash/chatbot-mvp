/**
 * OpenAI client configuration and utility functions
 */
import OpenAI from "openai";
import logger from "../../utils/logger.js";

// Initialize OpenAI client
let openaiClient = null;

/**
 * Get or create the OpenAI client instance
 * @returns {OpenAI} The OpenAI client instance
 */
export const getOpenAIClient = () => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      logger.error("OpenAI API key is missing");
      throw new Error("OpenAI API key is missing");
    }

    openaiClient = new OpenAI({
      apiKey: apiKey,
    });

    logger.info("OpenAI client initialized");
  }

  return openaiClient;
};

/**
 * Call OpenAI with function calling
 * @param {Object} options - Options for the OpenAI call
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.userMessage - User message
 * @param {Object} options.schema - JSON schema for function calling
 * @param {string} options.model - OpenAI model to use
 * @returns {Promise<Object>} The parsed function call result
 */
export const callOpenAIFunction = async ({
  systemPrompt,
  userMessage,
  schema,
  model = "gpt-4o-mini",
  temperature = 0.1,
  maxTokens = 500,
}) => {
  try {
    const client = getOpenAIClient();

    logger.info(`Calling OpenAI function with schema: ${schema.name}`);

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      functions: [schema],
      function_call: { name: schema.name },
      temperature: temperature,
      max_tokens: maxTokens,
    });

    // Extract and parse the function call
    const functionCall = response.choices[0].message.function_call;

    if (!functionCall || !functionCall.arguments) {
      logger.error("No function call in OpenAI response");
      throw new Error("No function call in OpenAI response");
    }

    try {
      const parsedArguments = JSON.parse(functionCall.arguments);
      logger.info(
        `Successfully parsed function call result for ${schema.name}`
      );
      return parsedArguments;
    } catch (parseError) {
      logger.error(
        `Error parsing function call arguments: ${parseError.message}`
      );
      logger.error(`Raw arguments: ${functionCall.arguments}`);
      throw new Error(
        `Failed to parse function call arguments: ${parseError.message}`
      );
    }
  } catch (error) {
    logger.error(`Error calling OpenAI function: ${error.message}`);
    throw error;
  }
};

export default {
  getOpenAIClient,
  callOpenAIFunction,
};

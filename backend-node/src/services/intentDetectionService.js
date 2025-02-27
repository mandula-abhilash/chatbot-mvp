import logger from "../utils/logger.js";
import { callOpenAIFunction } from "./openai/client.js";
import { intentDetectionSchema } from "./openai/schemas.js";
import { INTENT_DETECTION_PROMPT } from "./openai/prompts.js";

export const COMMAND_STRINGS = {
  BUILD_SQL: "build_sql",
  GENERATE_EMBEDDINGS: "generate_embeddings",
  SUGGEST_WHATSAPP_FLOW: "suggest_whatsapp_flow",
  FETCH_FAQ: "fetch_faq",
  IRRELEVANT_QUERY: "irrelevant_query",
  UNCLEAR_QUERY: "unclear_query",
  POTENTIAL_SECURITY_THREAT: "potential_security_threat",
};

/**
 * Detects user intent from message content and returns appropriate command string
 * @param {string} message - User message
 * @param {Object} businessContext - Business-specific metadata to help with classification
 * @returns {Promise<string>} - Command string for next processing step
 */
export const detectIntent = async (message, businessContext = {}) => {
  try {
    logger.info(`Detecting intent for message: ${message}`);

    // Format the user message with business context
    const userMessage = `Business Context: ${JSON.stringify(businessContext)}
Message: ${message}`;

    // Call OpenAI with function calling and JSON schema
    const result = await callOpenAIFunction({
      systemPrompt: INTENT_DETECTION_PROMPT,
      userMessage: userMessage,
      schema: intentDetectionSchema,
      model: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 150,
    });

    // Log the full result for debugging
    logger.info(`Intent detection result: ${JSON.stringify(result)}`);

    // Extract the intent from the result
    const intent = result.intent;

    // Validate the intent is one of our expected values
    if (!Object.values(COMMAND_STRINGS).includes(intent)) {
      logger.warn(`Invalid intent received from OpenAI: ${intent}`);
      return COMMAND_STRINGS.UNCLEAR_QUERY;
    }

    // Log confidence and reasoning if available
    if (result.confidence) {
      logger.info(`Intent confidence: ${result.confidence}`);
    }

    if (result.reasoning) {
      logger.info(`Intent reasoning: ${result.reasoning}`);
    }

    logger.info(`Detected intent: ${intent} for message: ${message}`);
    return intent;
  } catch (error) {
    logger.error("Error detecting intent:", error);
    // Default to unclear query if there's an error
    return COMMAND_STRINGS.UNCLEAR_QUERY;
  }
};

/**
 * Returns the possible command strings for reference
 * @returns {Object} All available command strings
 */
export const getCommandStrings = () => COMMAND_STRINGS;

/**
 * Handles the next steps after intent detection
 * @param {string} command - The detected command
 * @param {string} message - Original user message
 * @param {Object} businessContext - Business context data
 * @returns {Promise<string>} Response to send to user
 */
export const processCommand = async (
  command,
  message,
  businessContext = {}
) => {
  switch (command) {
    case COMMAND_STRINGS.BUILD_SQL:
      // Call function to query structured business data
      return await queryBusinessDatabase(message, businessContext);

    case COMMAND_STRINGS.GENERATE_EMBEDDINGS:
      // Call function to search against vector embeddings
      return await searchEmbeddings(message, businessContext);

    case COMMAND_STRINGS.SUGGEST_WHATSAPP_FLOW:
      // Determine appropriate WhatsApp flow
      return await triggerWhatsAppFlow(message, businessContext);

    case COMMAND_STRINGS.FETCH_FAQ:
      // Retrieve matching FAQ
      return await getFAQResponse(message, businessContext);

    case COMMAND_STRINGS.POTENTIAL_SECURITY_THREAT:
      // Log the potential threat and return safe response
      logger.warn(`Potential security threat detected: ${message}`);
      return "I'm unable to process your request at this time. If you need assistance, please try rephrasing your question.";

    case COMMAND_STRINGS.IRRELEVANT_QUERY:
      return "I'm specialized in helping with questions about our business, services, and products. I don't have information about topics outside this scope. Is there something specific about our business I can help you with?";

    case COMMAND_STRINGS.UNCLEAR_QUERY:
      return "I'm not sure I fully understand your question. Could you provide more details about what you're looking for?";

    default:
      logger.error(`Unknown command: ${command}`);
      return "I apologize, but I'm having trouble processing your request. Please try again or contact our customer service team directly.";
  }
};

// These function stubs would be implemented separately
const queryBusinessDatabase = async (message, businessContext) => {
  // Implementation for SQL query generation and execution
  return "I'll look that up in our database for you.";
};

const searchEmbeddings = async (message, businessContext) => {
  // Implementation for semantic search against embeddings
  return "Let me search for that information for you.";
};

const triggerWhatsAppFlow = async (message, businessContext) => {
  // Implementation for WhatsApp flow suggestion
  return "I can help you with that request. Let me guide you through the process.";
};

const getFAQResponse = async (message, businessContext) => {
  // Implementation for FAQ matching
  return "Here's the information you requested from our FAQ.";
};

import OpenAI from "openai";
import logger from "../utils/logger.js";

export const COMMAND_STRINGS = {
  BUILD_SQL: "build_sql",
  GENERATE_EMBEDDINGS: "generate_embeddings",
  SUGGEST_WHATSAPP_FLOW: "suggest_whatsapp_flow",
  FETCH_FAQ: "fetch_faq",
  IRRELEVANT_QUERY: "irrelevant_query",
  UNCLEAR_QUERY: "unclear_query",
};

const systemPrompt = `You are an intent detection model for a business chatbot. Your task is to classify user messages into specific command strings that determine the next processing step. You must ONLY respond with one of these exact command strings:
  - 'build_sql' → For queries about structured data (business hours, services, pricing)
  - 'generate_embeddings' → For unstructured queries needing semantic search
  - 'suggest_whatsapp_flow' → For queries about booking, catalogs, or specific inquiries
  - 'fetch_faq' → For queries that likely match a stored FAQ
  - 'irrelevant_query' → For queries unrelated to the business
  - 'unclear_query' → For vague queries needing clarification

  CRITICAL: 
  - Respond ONLY with the command string, no explanation or additional text
  - The command string must be exactly as shown above
  - Do not add any formatting or punctuation`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const detectIntent = async (message, businessContext = {}) => {
  try {
    logger.info(`Detecting intent for message: ${message}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.2, // Lower temperature for more consistent outputs
      max_tokens: 10, // We only need a short response
    });

    const command = completion.choices[0].message.content.trim();

    // Validate the command is one of our expected values
    if (!Object.values(COMMAND_STRINGS).includes(command)) {
      logger.warn(`Invalid command received from OpenAI: ${command}`);
      return COMMAND_STRINGS.UNCLEAR_QUERY;
    }

    logger.info(`Detected intent: ${command} for message: ${message}`);
    return command;
  } catch (error) {
    logger.error("Error detecting intent:", error);
    // Default to unclear query if there's an error
    return COMMAND_STRINGS.UNCLEAR_QUERY;
  }
};

export const getCommandStrings = () => COMMAND_STRINGS;

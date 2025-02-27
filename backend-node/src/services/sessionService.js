import {
  getActiveSession,
  createSession,
  updateSession,
  closeSession,
  logMessage,
} from "../models/sessionModel.js";
import { getBusinessGreeting } from "../models/businessGreetingModel.js";
import { getBusinessById } from "../models/businessModel.js";
import { sendMessage } from "./whatsappService.js";
import {
  detectIntent,
  COMMAND_STRINGS,
  processCommand,
} from "./intentDetectionService.js";
import { getSqlQueryResult } from "./sqlQueryService.js";
import logger from "../utils/logger.js";

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

const isSessionExpired = (session) => {
  const now = new Date();
  const lastActivity = new Date(session.updated_at);
  return now - lastActivity > SESSION_TIMEOUT;
};

/**
 * Generate response based on detected intent
 * @param {string} intent - The detected intent
 * @param {string} message - The user's message
 * @param {Object} businessContext - Business context information
 * @param {Array} relevantTables - Relevant database tables for the query
 * @returns {Promise<string>} - Response message to send
 */
const generateResponseForIntent = async (
  intent,
  message,
  businessContext,
  relevantTables = []
) => {
  try {
    logger.info(
      `Generating response for intent: ${intent}, message: ${message}`
    );
    logger.info(
      `Using relevant tables: ${relevantTables.join(", ") || "none specified"}`
    );

    switch (intent) {
      case COMMAND_STRINGS.BUILD_SQL:
        // Use the SQL query service with the tables identified by the intent detection
        logger.info(
          `Using SQL query service for message: ${message} with tables: ${relevantTables.join(
            ", "
          )}`
        );
        const sqlResponse = await getSqlQueryResult(message, relevantTables, 5);
        logger.info(`SQL query response: ${sqlResponse}`);
        return sqlResponse;

      case COMMAND_STRINGS.GENERATE_EMBEDDINGS:
        // For now, provide a placeholder response
        // TODO: Implement vector search when available
        return `Thank you for your question about "${message}". I'm searching our knowledge base for the most relevant information.`;

      case COMMAND_STRINGS.SUGGEST_WHATSAPP_FLOW:
        // Handle appointment booking, registration, etc.
        if (
          message.toLowerCase().includes("appointment") ||
          message.toLowerCase().includes("book") ||
          message.toLowerCase().includes("schedule")
        ) {
          return "I'd be happy to help you book an appointment. Please provide your preferred date and time, and I'll check our availability.";
        } else if (
          message.toLowerCase().includes("register") ||
          message.toLowerCase().includes("sign up")
        ) {
          return "To register for our services, I'll need some information from you. Could you please provide your name and email address?";
        } else {
          return "I can help you with that request. Could you please provide more specific details about what you're looking for?";
        }

      case COMMAND_STRINGS.FETCH_FAQ:
        // Use SQL query service to find matching FAQs
        logger.info(`Searching FAQs for: ${message}`);
        const faqQuery = `Find a FAQ that answers: ${message}`;
        const faqResponse = await getSqlQueryResult(
          faqQuery,
          relevantTables.length > 0 ? relevantTables : ["business_faqs"],
          1
        );
        logger.info(`FAQ response: ${faqResponse}`);
        return faqResponse;

      case COMMAND_STRINGS.POTENTIAL_SECURITY_THREAT:
        // Log the potential threat and return safe response
        logger.warn(`Potential security threat detected: ${message}`);
        return "I'm unable to process your request at this time. If you need assistance, please try rephrasing your question.";

      case COMMAND_STRINGS.IRRELEVANT_QUERY:
        return "I'm specialized in helping with questions about our business, services, and products. I don't have information about topics outside this scope. Is there something specific about our business I can help you with?";

      case COMMAND_STRINGS.UNCLEAR_QUERY:
        return "I'm not sure I fully understand your question. Could you provide more details about what you're looking for?";

      default:
        // For other intents, we'll implement specific handlers later
        return `Thank you for your message. I'm working on finding the information you need.`;
    }
  } catch (error) {
    logger.error(`Error generating response for intent ${intent}:`, error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
  }
};

export const processIncomingMessage = async (
  phoneNumber,
  message,
  businessId,
  wamid
) => {
  try {
    logger.info(
      `Processing message from ${phoneNumber} for business ${businessId}`
    );

    let session = await getActiveSession(phoneNumber, businessId);
    let isNewSession = false;
    logger.info(`Existing session found: ${session ? "yes" : "no"}`);

    if (message?.toLowerCase() === "accepted" && session) {
      await closeSession(session.id);
      logger.info(`Session ${session.id} closed`);
      return;
    }

    if (!session || isSessionExpired(session)) {
      if (session) {
        try {
          await sendMessage(
            phoneNumber,
            "Your session has timed out due to inactivity on the channel. Closing the chat session",
            session.id,
            businessId
          );
          logger.info(`Timeout message sent to ${phoneNumber}`);
        } catch (error) {
          logger.error(`Failed to send timeout message: ${error.message}`);
        }

        await closeSession(session.id);
        logger.info(`Expired session ${session.id} closed`);
      }

      session = await createSession(phoneNumber, businessId);
      isNewSession = true;
      logger.info(`New session created: ${session.id}`);
    }

    // Log the incoming message with its WhatsApp message ID
    await logMessage({
      business_id: businessId,
      session_id: session.id,
      phone_number: phoneNumber,
      message_direction: "incoming",
      wamid: wamid,
      message_type: "text",
      message_status: "received",
      metadata: {},
    });
    logger.info(`Incoming message logged`);

    // Always detect intent for every message
    const intentResult = await detectIntent(message, {
      businessId,
      sessionId: session.id,
    });

    // Extract intent and relevant tables from the result
    const intent = intentResult.intent;
    const relevantTables = intentResult.relevantTables || [];

    logger.info(`Detected intent: ${intent} for message: ${message}`);
    logger.info(`Relevant tables: ${relevantTables.join(", ") || "none"}`);

    // Store the intent and relevant tables in the session context
    const context = {
      ...session.context,
      lastIntent: intent,
      lastMessage: message,
      relevantTables: relevantTables,
    };

    // Update session with the new context
    await updateSession(session.id, {
      last_message: message,
      context,
      updated_at: new Date(),
    });
    logger.info(`Session updated with intent: ${intent}`);

    // Only send greeting message for new sessions
    if (isNewSession) {
      const [greeting, business] = await Promise.all([
        getBusinessGreeting(businessId),
        getBusinessById(businessId),
      ]);
      logger.info(`Fetched greeting and business info for ${businessId}`);

      let greetingMessage;
      if (greeting && business) {
        greetingMessage = `*Welcome to ${business.name}!* 🌟\n\n${greeting.greeting_message}\n\n*Example questions you can ask:*\n`;
        greetingMessage += greeting.example_questions
          .map((q) => ` • _${q}_`)
          .join("\n");
        greetingMessage +=
          "\n\n_Please choose from the examples above or ask your own question._";
      } else {
        greetingMessage = `*Hello!* 👋\n\nWelcome to ${
          business?.name || "our business"
        }. How can I assist you today?`;
      }

      try {
        await sendMessage(phoneNumber, greetingMessage, session.id, businessId);
        logger.info(`Greeting message sent to ${phoneNumber}`);
      } catch (error) {
        logger.error(`Failed to send greeting message: ${error.message}`);
      }
    } else {
      // For existing sessions, generate and send a response based on the detected intent
      try {
        // Create business context for response generation
        const businessContext = {
          businessId,
          sessionId: session.id,
          phoneNumber,
          context: session.context,
        };

        // Generate response using the enhanced function with relevant tables
        const responseMessage = await generateResponseForIntent(
          intent,
          message,
          businessContext,
          relevantTables
        );

        await sendMessage(phoneNumber, responseMessage, session.id, businessId);
        logger.info(`Response sent to ${phoneNumber} for intent: ${intent}`);
      } catch (error) {
        logger.error(`Failed to send response: ${error.message}`);
      }
    }

    return session;
  } catch (error) {
    logger.error("Error processing incoming message:", error);
    throw error;
  }
};

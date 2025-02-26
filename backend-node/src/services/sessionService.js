import {
  getActiveSession,
  createSession,
  updateSession,
  closeSession,
  logMessage,
} from "../models/sessionModel.js";
import { getBusinessGreeting } from "../models/businessGreetingModel.js";
import { sendMessage } from "./whatsappService.js";
import logger from "../utils/logger.js";

const SESSION_TIMEOUT = 2 * 60 * 1000; // 15 minutes in milliseconds

const isSessionExpired = (session) => {
  const now = new Date();
  const lastActivity = new Date(session.updated_at);
  return now - lastActivity > SESSION_TIMEOUT;
};

export const processIncomingMessage = async (
  phoneNumber,
  message,
  businessId
) => {
  try {
    logger.info(
      `Processing message from ${phoneNumber} for business ${businessId}`
    );

    // First get or create session
    let session = await getActiveSession(phoneNumber, businessId);
    logger.info(`Existing session found: ${session ? "yes" : "no"}`);

    // Check if message is "Accepted" to close session
    if (message.toLowerCase() === "accepted" && session) {
      await closeSession(session.id);
      logger.info(`Session ${session.id} closed`);
      return;
    }

    // If no active session or session expired, create new one
    if (!session || isSessionExpired(session)) {
      if (session) {
        // Send timeout message before closing the session
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

      // Create a new session for any incoming message
      session = await createSession(phoneNumber, businessId);
      logger.info(`New session created: ${session.id}`);
    }

    // Now that we have a valid session, log the incoming message
    await logMessage({
      business_id: businessId,
      session_id: session.id,
      phone_number: phoneNumber,
      message_direction: "incoming",
      message_text: message,
      message_type: "text",
      message_status: "received",
    });
    logger.info(`Incoming message logged`);

    // If this was a new session, send the greeting
    if (!session.last_message) {
      const greeting = await getBusinessGreeting(businessId);
      logger.info(`Fetched greeting for business ${businessId}`);

      let greetingMessage;
      if (greeting) {
        greetingMessage = `${
          greeting.greeting_message
        }\n\nExample questions you can ask:\n${greeting.example_questions.join(
          "\n"
        )}`;
      } else {
        greetingMessage = "Hello! How can I assist you today?";
      }

      try {
        await sendMessage(phoneNumber, greetingMessage, session.id, businessId);
        logger.info(`Greeting message sent to ${phoneNumber}`);
      } catch (error) {
        logger.error(`Failed to send greeting message: ${error.message}`);
      }
    } else {
      // For existing sessions, send a simple acknowledgment
      try {
        await sendMessage(
          phoneNumber,
          "Thank you for your message. I'll help you with that.",
          session.id,
          businessId
        );
        logger.info(`Acknowledgment sent to ${phoneNumber}`);
      } catch (error) {
        logger.error(`Failed to send acknowledgment: ${error.message}`);
      }
    }

    // Update existing session with last message and timestamp
    await updateSession(session.id, {
      last_message: message,
      updated_at: new Date(),
    });
    logger.info(`Session updated with last message`);

    return session;
  } catch (error) {
    logger.error("Error processing incoming message:", error);
    throw error;
  }
};

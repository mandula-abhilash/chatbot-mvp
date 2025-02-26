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
import logger from "../utils/logger.js";

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

const isSessionExpired = (session) => {
  const now = new Date();
  const lastActivity = new Date(session.updated_at);
  return now - lastActivity > SESSION_TIMEOUT;
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
      wamid: wamid,
      message_type: "text",
      message_status: "received",
      metadata: { text: message },
    });
    logger.info(`Incoming message logged`);

    // If this was a new session, send the greeting
    if (!session.last_message) {
      const [greeting, business] = await Promise.all([
        getBusinessGreeting(businessId),
        getBusinessById(businessId),
      ]);
      logger.info(`Fetched greeting and business info for ${businessId}`);

      let greetingMessage;
      if (greeting && business) {
        greetingMessage = `*Welcome to ${business.name}!* 🌟\n\n${greeting.greeting_message}\n\n*Example questions you can ask:*\n`;
        // Add each example question as a bullet point
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
      // For existing sessions, send a simple acknowledgment
      try {
        await sendMessage(
          phoneNumber,
          "✨ Thank you for your message. I'll help you with that.",
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

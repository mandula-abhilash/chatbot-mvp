import {
  getActiveSession,
  createSession,
  updateSession,
  closeSession,
  logMessage,
} from "../models/sessionModel.js";
import { getBusinessGreeting } from "../models/businessGreetingModel.js";
import whatsappService from "../utils/whatsappService.js";

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const processIncomingMessage = async (
  phoneNumber,
  message,
  businessId
) => {
  try {
    // Log the incoming message
    await logMessage({
      business_id: businessId,
      phone_number: phoneNumber,
      message_direction: "incoming",
      message_text: message,
      message_type: "text",
      message_status: "received",
    });

    let session = await getActiveSession(phoneNumber, businessId);

    // Check if message is "Accepted" to close session
    if (message.toLowerCase() === "accepted" && session) {
      await closeSession(session.id);
      return;
    }

    // If no active session or session expired, create new one and send greeting
    if (!session || isSessionExpired(session)) {
      if (session) {
        await closeSession(session.id);
      }

      session = await createSession(phoneNumber, businessId);
      const greeting = await getBusinessGreeting(businessId);

      if (greeting) {
        const greetingMessage = `${
          greeting.greeting_message
        }\n\nExample questions you can ask:\n${greeting.example_questions.join(
          "\n"
        )}`;
        await whatsappService.sendMessage(phoneNumber, greetingMessage);
      }
    } else {
      // Update existing session with last message
      await updateSession(session.id, {
        last_message: message,
      });
    }

    return session;
  } catch (error) {
    console.error("Error processing incoming message:", error);
    throw error;
  }
};

const isSessionExpired = (session) => {
  const now = new Date();
  const sessionStart = new Date(session.started_at);
  return now - sessionStart > SESSION_TIMEOUT;
};

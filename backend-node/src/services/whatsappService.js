import axios from "axios";
import { logMessage } from "../models/sessionModel.js";
import logger from "../utils/logger.js";

const apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";
const baseUrl = `https://graph.facebook.com/${apiVersion}`;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const accessToken = process.env.ACCESS_TOKEN;

// Log configuration on startup
logger.info(`WhatsApp Service initialized with:
  API Version: ${apiVersion}
  Phone Number ID: ${phoneNumberId}
  Base URL: ${baseUrl}
`);

export const sendMessage = async (
  phoneNumber,
  message,
  sessionId,
  businessId
) => {
  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    text: { body: message },
  };

  logger.info(`Attempting to send message to ${phoneNumber}`);
  logger.debug(`Request payload: ${JSON.stringify(payload)}`);

  try {
    const response = await axios.post(
      `${baseUrl}/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    logger.info(`WhatsApp API response: ${JSON.stringify(response.data)}`);

    // Log the successful outgoing message with wamid from response
    await logMessage({
      business_id: businessId,
      session_id: sessionId,
      phone_number: phoneNumber,
      message_direction: "outgoing",
      wamid: response.data.messages[0].id,
      message_type: "text",
      message_status: "sent",
      metadata: { text: message, ...response.data },
    });

    return response.data;
  } catch (error) {
    logger.error(
      `HTTP error sending message to ${phoneNumber}: ${error.message}`
    );
    if (error.response) {
      logger.error(`Response content: ${JSON.stringify(error.response.data)}`);
    }

    // Generate a temporary WAMID for failed messages
    const tempWamid = `failed_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Log the failed message attempt
    await logMessage({
      business_id: businessId,
      session_id: sessionId,
      phone_number: phoneNumber,
      message_direction: "outgoing",
      wamid: tempWamid,
      message_type: "text",
      message_status: "failed",
      metadata: {
        text: message,
        error: error.response?.data || error.message,
      },
    });

    throw error;
  }
};

export default {
  sendMessage,
};

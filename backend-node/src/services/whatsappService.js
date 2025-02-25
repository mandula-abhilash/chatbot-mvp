import axios from "axios";
import { logMessage } from "../models/sessionModel.js";
import logger from "../utils/logger.js";

class WhatsAppService {
  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.phoneNumberId = process.env.PHONE_NUMBER_ID;
    this.accessToken = process.env.ACCESS_TOKEN;

    // Log configuration on startup
    logger.info(`WhatsApp Service initialized with:
      API Version: ${this.apiVersion}
      Phone Number ID: ${this.phoneNumberId}
      Base URL: ${this.baseUrl}
    `);
  }

  async sendMessage(phoneNumber, message, sessionId, businessId) {
    const payload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      text: { body: message },
    };

    logger.info(`Attempting to send message to ${phoneNumber}`);
    logger.debug(`Request payload: ${JSON.stringify(payload)}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      logger.info(`WhatsApp API response: ${JSON.stringify(response.data)}`);

      // Log the successful outgoing message
      await logMessage({
        business_id: businessId,
        session_id: sessionId,
        phone_number: phoneNumber,
        message_direction: "outgoing",
        message_text: message,
        message_type: "text",
        message_status: "sent",
        metadata: response.data,
      });

      return response.data;
    } catch (error) {
      logger.error(
        `HTTP error sending message to ${phoneNumber}: ${error.message}`
      );
      if (error.response) {
        logger.error(
          `Response content: ${JSON.stringify(error.response.data)}`
        );
      }

      // Log the failed message attempt
      await logMessage({
        business_id: businessId,
        session_id: sessionId,
        phone_number: phoneNumber,
        message_direction: "outgoing",
        message_text: message,
        message_type: "text",
        message_status: "failed",
        metadata: {
          error: error.response?.data || error.message,
        },
      });

      throw error;
    }
  }
}

export default new WhatsAppService();

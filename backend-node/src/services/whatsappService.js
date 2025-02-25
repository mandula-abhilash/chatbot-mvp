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

  async sendMessage(phoneNumber, message, type = "text", metadata = {}) {
    try {
      logger.info(`Attempting to send message to ${phoneNumber}`);
      logger.debug(`Message content: ${message}`);

      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error(
          "WhatsApp configuration missing. Check ACCESS_TOKEN and PHONE_NUMBER_ID environment variables."
        );
      }

      const payload = this._createMessagePayload(phoneNumber, message, type);
      logger.debug(`Request payload: ${JSON.stringify(payload)}`);

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

      logger.info(`WhatsApp API Response: ${JSON.stringify(response.data)}`);

      // Log the outgoing message
      await logMessage({
        business_id: this.phoneNumberId, // Use phone_number_id as business_id
        phone_number: phoneNumber,
        message_direction: "outgoing",
        message_text:
          typeof message === "string" ? message : JSON.stringify(message),
        message_type: type,
        message_status: "sent",
        metadata: {
          ...metadata,
          whatsapp_message_id: response.data?.messages?.[0]?.id,
        },
      });

      logger.info(`Message sent successfully to ${phoneNumber}`);
      return response.data;
    } catch (error) {
      logger.error(
        `Error sending WhatsApp message to ${phoneNumber}:`,
        error.response?.data || error.message
      );

      // Log the failed message attempt
      await logMessage({
        business_id: this.phoneNumberId,
        phone_number: phoneNumber,
        message_direction: "outgoing",
        message_text:
          typeof message === "string" ? message : JSON.stringify(message),
        message_type: type,
        message_status: "failed",
        metadata: {
          ...metadata,
          error: error.response?.data || error.message,
        },
      });

      throw error;
    }
  }

  _createMessagePayload(phoneNumber, message, type) {
    const basePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
    };

    switch (type) {
      case "text":
        return {
          ...basePayload,
          type: "text",
          text: { body: message },
        };

      case "interactive":
        return {
          ...basePayload,
          type: "interactive",
          interactive: message,
        };

      case "template":
        return {
          ...basePayload,
          type: "template",
          template: message,
        };

      default:
        throw new Error(`Unsupported message type: ${type}`);
    }
  }
}

export default new WhatsAppService();

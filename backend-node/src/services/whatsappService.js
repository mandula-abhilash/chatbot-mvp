import axios from "axios";
import { logMessage } from "../models/sessionModel.js";
import logger from "../utils/logger.js";

class WhatsAppService {
  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.phoneNumberId = process.env.PHONE_NUMBER_ID;
    this.accessToken = process.env.ACCESS_TOKEN;
  }

  async sendMessage(phoneNumber, message, type = "text", metadata = {}) {
    try {
      const payload = this._createMessagePayload(phoneNumber, message, type);

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

      // Log the outgoing message
      await logMessage({
        phone_number: phoneNumber,
        message_direction: "outgoing",
        message_text:
          typeof message === "string" ? message : JSON.stringify(message),
        message_type: type,
        message_status: "sent",
        metadata,
      });

      logger.info(`Message sent successfully to ${phoneNumber}`);
      return response.data;
    } catch (error) {
      logger.error(
        "Error sending WhatsApp message:",
        error.response?.data || error
      );

      // Log the failed message attempt
      await logMessage({
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

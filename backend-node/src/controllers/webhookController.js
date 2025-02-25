import { processIncomingMessage } from "../services/sessionService.js";
import logger from "../utils/logger.js";

export const verifyWebhook = (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Log query parameters
    logger.info(
      `Received Webhook Verification Request: hub_mode=${mode}, ` +
        `hub_verify_token=${token}, hub_challenge=${challenge}`
    );

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      logger.info("Webhook verified successfully");
      return res.status(200).send(challenge);
    }

    logger.warn("Webhook verification failed");
    return res.status(403).json({ error: "Verification failed" });
  } catch (error) {
    logger.error("Error verifying webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    // Log raw request details
    logger.info(`Received webhook POST request to ${req.url}`);
    logger.info("Request headers:", req.headers);
    logger.info("Raw request body:", req.body);

    const { object, entry } = req.body;

    if (object !== "whatsapp_business_account") {
      return res.status(400).json({ error: "Invalid request object" });
    }

    for (const entryData of entry) {
      for (const change of entryData.changes) {
        if (change.value.messages) {
          for (const message of change.value.messages) {
            const phoneNumber = message.from;
            const messageText = message.text?.body;
            const businessId = entryData.id;

            if (phoneNumber && messageText && businessId) {
              logger.info(
                `Message received from ${phoneNumber}: ${messageText}`
              );

              try {
                await processIncomingMessage(
                  phoneNumber,
                  messageText,
                  businessId
                );
                logger.info(`Reply sent successfully to ${phoneNumber}`);
              } catch (error) {
                logger.error(
                  `Failed to process message from ${phoneNumber}:`,
                  error
                );
                throw error;
              }
            }
          }
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Error handling webhook:", error);
    return res.status(500).send("Internal Server Error");
  }
};

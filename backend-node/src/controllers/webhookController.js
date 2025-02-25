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
    // Log detailed request information
    logger.info("Received webhook POST request");
    logger.info("Request headers:", req.headers);

    const { object, entry } = req.body;

    // Log the entire webhook payload for debugging
    logger.info("Webhook Payload Details:");
    logger.info(`Object Type: ${object}`);
    logger.info("Entry Data:", JSON.stringify(entry, null, 2));

    if (!object || !entry) {
      logger.warn("Invalid webhook payload - missing object or entry");
      return res
        .status(400)
        .json({ error: "Invalid webhook payload structure" });
    }

    if (object !== "whatsapp_business_account") {
      logger.warn(`Invalid object type: ${object}`);
      return res.status(400).json({ error: "Invalid request object" });
    }

    logger.info(`Processing ${entry.length} entries`);

    for (const entryData of entry) {
      // Log the WhatsApp Business Account ID
      logger.info(`WhatsApp Business Account ID: ${entryData.id}`);

      if (!entryData.changes) {
        logger.warn("Entry missing changes array");
        continue;
      }

      for (const change of entryData.changes) {
        if (!change.value || !change.value.messages) {
          logger.warn("Change missing value or messages");
          continue;
        }

        for (const message of change.value.messages) {
          const phoneNumber = message.from;
          const messageText = message.text?.body;
          const businessId = entryData.id;

          // Log detailed message information
          logger.info("Message Details:");
          logger.info(`- Business ID: ${businessId}`);
          logger.info(`- From Phone: ${phoneNumber}`);
          logger.info(`- Message: ${messageText}`);

          if (!phoneNumber || !messageText || !businessId) {
            logger.warn(
              `Missing required message data: phone=${phoneNumber}, ` +
                `text=${messageText}, businessId=${businessId}`
            );
            continue;
          }

          try {
            await processIncomingMessage(phoneNumber, messageText, businessId);
            logger.info(`Successfully processed message from ${phoneNumber}`);
          } catch (error) {
            logger.error(
              `Failed to process message from ${phoneNumber}:`,
              error
            );
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

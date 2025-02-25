import { processIncomingMessage } from "../services/sessionService.js";

export const verifyWebhook = (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return res.status(200).send(challenge);
    }

    console.warn("Webhook verification failed");
    return res.sendStatus(403);
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return res.sendStatus(500);
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const { object, entry } = req.body;

    if (object !== "whatsapp_business_account") {
      return res.sendStatus(400);
    }

    for (const entryData of entry) {
      for (const change of entryData.changes) {
        if (change.value.messages) {
          for (const message of change.value.messages) {
            const phoneNumber = message.from;
            const messageText = message.text?.body;
            const businessId = entryData.id;

            if (phoneNumber && messageText && businessId) {
              await processIncomingMessage(
                phoneNumber,
                messageText,
                businessId
              );
            }
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling webhook:", error);
    return res.sendStatus(500);
  }
};

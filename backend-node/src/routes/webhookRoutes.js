import express from "express";
import {
  verifyWebhook,
  handleWebhook,
} from "../controllers/webhookController.js";

const router = express.Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhook);

export default router;

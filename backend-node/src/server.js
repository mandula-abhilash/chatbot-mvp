import app from "./app.js";
import dotenv from "dotenv";
import { cleanupService } from "./services/cleanupService.js";
import logger from "./utils/logger.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Start the cleanup service when the server starts
cleanupService.start();
logger.info("Cleanup service started");

app.listen(PORT, () => {
  console.log(`Whatsapp API Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  cleanupService.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  cleanupService.stop();
  process.exit(0);
});

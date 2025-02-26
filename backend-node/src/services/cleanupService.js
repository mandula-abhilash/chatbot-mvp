import logger from "../utils/logger.js";
import { cleanupInactiveSessions } from "../models/sessionModel.js";
import whatsappService from "./whatsappService.js";

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  }

  start() {
    if (this.isRunning) {
      logger.warn("Cleanup service is already running");
      return;
    }

    logger.info("Starting session cleanup service");
    this.isRunning = true;
    this.intervalId = setInterval(
      this.cleanup.bind(this),
      this.CLEANUP_INTERVAL
    );

    // Handle graceful shutdown
    process.on("SIGTERM", () => this.stop());
    process.on("SIGINT", () => this.stop());
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping session cleanup service");
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = null;
  }

  async cleanup() {
    try {
      const startTime = Date.now();
      const expiredSessions = await cleanupInactiveSessions(
        this.SESSION_TIMEOUT
      );
      const duration = Date.now() - startTime;

      if (expiredSessions.length > 0) {
        logger.info(
          `Found ${expiredSessions.length} inactive sessions to clean up`
        );

        // Send notification to each user whose session was closed
        for (const session of expiredSessions) {
          try {
            await whatsappService.sendMessage(
              session.phone_number,
              "Your chat session has been closed due to inactivity. Feel free to send a new message to start a fresh conversation.",
              session.id,
              session.business_id
            );
            logger.info(`Sent closure notification to ${session.phone_number}`);
          } catch (error) {
            logger.error(
              `Failed to send closure notification to ${session.phone_number}:`,
              error
            );
          }
        }

        logger.info(
          `Completed cleanup of ${expiredSessions.length} sessions in ${duration}ms`
        );
      }
    } catch (error) {
      logger.error("Error during session cleanup:", error);
    }
  }
}

export default new CleanupService();

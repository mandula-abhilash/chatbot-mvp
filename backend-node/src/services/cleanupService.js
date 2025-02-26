import logger from "../utils/logger.js";
import { cleanupInactiveSessions } from "../models/sessionModel.js";
import { sendMessage } from "./whatsappService.js";

const SESSION_TIMEOUT = 2 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 2 * 60 * 1000; // 5 minutes

let isRunning = false;
let intervalId = null;

const cleanup = async () => {
  try {
    const startTime = Date.now();
    const expiredSessions = await cleanupInactiveSessions(SESSION_TIMEOUT);
    const duration = Date.now() - startTime;

    if (expiredSessions.length > 0) {
      logger.info(
        `Found ${expiredSessions.length} inactive sessions to clean up`
      );

      // Send notification to each user whose session was closed
      for (const session of expiredSessions) {
        try {
          await sendMessage(
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
};

const start = () => {
  if (isRunning) {
    logger.warn("Cleanup service is already running");
    return;
  }

  logger.info("Starting session cleanup service");
  isRunning = true;
  intervalId = setInterval(cleanup, CLEANUP_INTERVAL);

  // Handle graceful shutdown
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
};

const stop = () => {
  if (!isRunning) {
    return;
  }

  logger.info("Stopping session cleanup service");
  clearInterval(intervalId);
  isRunning = false;
  intervalId = null;
};

export const cleanupService = {
  start,
  stop,
  cleanup,
};

export default cleanupService;

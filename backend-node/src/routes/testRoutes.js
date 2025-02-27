import express from "express";
import {
  detectIntent,
  COMMAND_STRINGS,
} from "../services/intentDetectionService.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * Test endpoint for intent detection
 * POST /api/test/intent-detection
 *
 * Request body:
 * {
 *   "message": "What are your business hours?",
 *   "businessContext": { "businessId": "test_business_123" }
 * }
 *
 * Response:
 * {
 *   "message": "What are your business hours?",
 *   "detectedIntent": "build_sql",
 *   "expectedIntent": "build_sql" (optional),
 *   "success": true,
 *   "responseTime": 1234
 * }
 */
router.post("/intent-detection", async (req, res) => {
  try {
    const { message, businessContext, expectedIntent } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    logger.info(`Testing intent detection for message: "${message}"`);

    const startTime = Date.now();
    const detectedIntent = await detectIntent(message, businessContext || {});
    const responseTime = Date.now() - startTime;

    const response = {
      message,
      detectedIntent,
      responseTime,
    };

    // If expectedIntent is provided, add success flag
    if (expectedIntent) {
      response.expectedIntent = expectedIntent;
      response.success = detectedIntent === expectedIntent;
    }

    logger.info(
      `Intent detection result: ${detectedIntent}, time: ${responseTime}ms`
    );
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error in intent detection test: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get all available command strings
 * GET /api/test/command-strings
 */
router.get("/command-strings", (req, res) => {
  return res.status(200).json(COMMAND_STRINGS);
});

/**
 * Run a batch test with multiple messages
 * POST /api/test/batch-intent-detection
 *
 * Request body:
 * {
 *   "testCases": [
 *     {
 *       "message": "What are your business hours?",
 *       "expectedIntent": "build_sql",
 *       "businessContext": { "businessId": "test_business_123" }
 *     },
 *     ...
 *   ]
 * }
 */
router.post("/batch-intent-detection", async (req, res) => {
  try {
    const { testCases } = req.body;

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res
        .status(400)
        .json({ error: "Valid testCases array is required" });
    }

    logger.info(
      `Running batch intent detection test with ${testCases.length} cases`
    );

    const results = [];
    let passCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
      try {
        const { message, expectedIntent, businessContext } = testCase;

        if (!message) {
          results.push({
            error: "Message is required",
            testCase,
          });
          failCount++;
          continue;
        }

        const startTime = Date.now();
        const detectedIntent = await detectIntent(
          message,
          businessContext || {}
        );
        const responseTime = Date.now() - startTime;

        const success = expectedIntent
          ? detectedIntent === expectedIntent
          : true;

        if (success && expectedIntent) {
          passCount++;
        } else if (expectedIntent) {
          failCount++;
        }

        results.push({
          message,
          detectedIntent,
          expectedIntent,
          success,
          responseTime,
        });
      } catch (error) {
        results.push({
          error: error.message,
          testCase,
        });
        failCount++;
      }
    }

    return res.status(200).json({
      results,
      summary: {
        total: testCases.length,
        passed: passCount,
        failed: failCount,
        successRate:
          testCases.length > 0
            ? Math.round((passCount / testCases.length) * 100)
            : 0,
      },
    });
  } catch (error) {
    logger.error(`Error in batch intent detection test: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

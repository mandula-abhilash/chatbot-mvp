import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import webhookRoutes from "./routes/webhookRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import logger from "./utils/logger.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors());

// Compression middleware
app.use(compression());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api", webhookRoutes);
app.use("/api", healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;

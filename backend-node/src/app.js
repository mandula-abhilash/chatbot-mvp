import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import webhookRoutes from "./routes/webhookRoutes.js";

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

// Routes
app.use("/api", webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeRepoRoute } from "./routes/analyze.js";
import { webhookRoute } from "./routes/webhooks.js";
import { botConfigRoute } from "./routes/botConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Parse JSON and preserve raw body for webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "smar-ai server is running" });
});

// API Routes
app.use("/api", analyzeRepoRoute);
app.use("/api/webhooks", webhookRoute);
app.use("/api/bot", botConfigRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Initialize database and worker if bot env vars are configured
const startServer = async () => {
  if (process.env.GITHUB_APP_ID && process.env.DATABASE_URL) {
    try {
      const { runMigrations } = await import("./config/database.js");
      await runMigrations();
      console.log("Database migrations complete");

      const { startReviewWorker } = await import("./workers/reviewWorker.js");
      startReviewWorker();
    } catch (err) {
      console.warn(
        "Bot infrastructure not available (this is fine if you only use the analyzer):",
        err.message,
      );
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 smar-ai server running on port ${PORT}`);
  });
};

startServer();

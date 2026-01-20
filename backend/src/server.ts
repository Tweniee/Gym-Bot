import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { ollamaClient } from "./llm/ollamaClient";
import { qdrantService } from "./vector/qdrantClient";
import { ingestionService } from "./ingest/ingestionService";
import { chatService, ChatRequest } from "./chat/chatService";
import { documentProcessor } from "./ingest/documentProcessor";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(config.uploadDir, { recursive: true });
      cb(null, config.uploadDir);
    } catch (error) {
      cb(error as Error, config.uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (documentProcessor.isValidFileType(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only .txt, .md, and .pdf are allowed."));
    }
  },
});

// Health check endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const ollamaHealthy = await ollamaClient.healthCheck();
    const qdrantHealthy = await qdrantService.healthCheck();

    const status = ollamaHealthy && qdrantHealthy ? "healthy" : "unhealthy";
    const statusCode = status === "healthy" ? 200 : 503;

    res.status(statusCode).json({
      status,
      services: {
        ollama: ollamaHealthy ? "up" : "down",
        qdrant: qdrantHealthy ? "up" : "down",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Health check failed", error);
    res.status(503).json({
      status: "unhealthy",
      error: "Health check failed",
    });
  }
});

// Ingest endpoint
app.post(
  "/api/ingest",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      logger.info(`Received file: ${req.file.originalname}`);

      const result = await ingestionService.ingestDocument(
        req.file.path,
        req.file.originalname,
      );

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        logger.warn("Failed to delete uploaded file", error);
      }

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error("Ingest endpoint error", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// Chat endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { question } = req.body as ChatRequest;

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return res.status(400).json({
        error: "Question is required and must be a non-empty string",
      });
    }

    const response = await chatService.processChat({ question });
    res.status(200).json(response);
  } catch (error) {
    logger.error("Chat endpoint error", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
  });
});

// Initialize and start server
async function startServer() {
  try {
    logger.info("Initializing server...");

    // Check Ollama connection
    logger.info("Checking Ollama connection...");
    const ollamaHealthy = await ollamaClient.healthCheck();
    if (!ollamaHealthy) {
      logger.warn("Ollama is not ready. Make sure models are pulled.");
    }

    // Check Qdrant connection
    logger.info("Checking Qdrant connection...");
    const qdrantHealthy = await qdrantService.healthCheck();
    if (!qdrantHealthy) {
      throw new Error("Qdrant is not available");
    }

    // Initialize Qdrant collection
    logger.info("Initializing Qdrant collection...");
    await qdrantService.initializeCollection(768); // nomic-embed-text produces 768-dim vectors

    // Create upload directory
    await fs.mkdir(config.uploadDir, { recursive: true });

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Embedding model: ${config.embeddingModel}`);
      logger.info(`Chat model: ${config.chatModel}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './utils/config';
import { logger } from './utils/logger';
import { ollamaClient } from './llm/ollamaClient';
import { qdrantService } from './vector/qdrantClient';
import { chatService, ChatRequest } from './chat/chatService';
import { autoIngestService } from './ingest/autoIngestService';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const ollamaHealthy = await ollamaClient.healthCheck();
    const qdrantHealthy = await qdrantService.healthCheck();

    const status = ollamaHealthy && qdrantHealthy ? 'healthy' : 'unhealthy';
    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status,
      services: {
        ollama: ollamaHealthy ? 'up' : 'down',
        qdrant: qdrantHealthy ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

// Documents info endpoint
app.get('/api/documents', async (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      documentsDirectory: autoIngestService.getWatchDirectory(),
      processedFiles: autoIngestService.getProcessedFiles(),
      message:
        'Place PDF, CSV, TXT, or MD files in the documents directory and restart to ingest',
    });
  } catch (error) {
    logger.error('Documents info endpoint error', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { question } = req.body as ChatRequest;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        error: 'Question is required and must be a non-empty string',
      });
      return;
    }

    const response = await chatService.processChat({ question });
    res.status(200).json(response);
  } catch (error) {
    logger.error('Chat endpoint error', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
  });
});

// Initialize and start server
async function startServer() {
  try {
    logger.info('Initializing server...');

    // Check Ollama connection
    logger.info('Checking Ollama connection...');
    const ollamaHealthy = await ollamaClient.healthCheck();
    if (!ollamaHealthy) {
      logger.warn('Ollama is not ready. Make sure models are pulled.');
    }

    // Check Qdrant connection
    logger.info('Checking Qdrant connection...');
    const qdrantHealthy = await qdrantService.healthCheck();
    if (!qdrantHealthy) {
      throw new Error('Qdrant is not available');
    }

    // Initialize Qdrant collection
    logger.info('Initializing Qdrant collection...');
    await qdrantService.initializeCollection(768); // nomic-embed-text produces 768-dim vectors

    // Initialize and run auto-ingest service
    logger.info('Initializing auto-ingest service...');
    await autoIngestService.initialize();
    logger.info(`Documents directory: ${autoIngestService.getWatchDirectory()}`);

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Embedding model: ${config.embeddingModel}`);
      logger.info(`Chat model: ${config.chatModel}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

import { Router } from 'express';
import { webhookController } from './webhook.controller';

/**
 * RAG Routes
 *
 * Defines HTTP endpoints for RAG webhook ingestion.
 *
 * Routes:
 * - POST /rag/webhook - Receives document change events
 * - GET /rag/health - Health check for RAG services
 */

const router = Router();

/**
 * POST /rag/webhook
 *
 * Receives webhook events for document changes
 *
 * Request body:
 * {
 *   "event": "document.created" | "document.updated" | "document.deleted",
 *   "collection": "products",
 *   "documentId": "507f1f77bcf86cd799439011"
 * }
 *
 * Response: 202 Accepted (async processing)
 */
router.post('/webhook', (req, res) => webhookController.handleWebhook(req, res));

/**
 * GET /rag/health
 *
 * Health check for RAG ingestion services
 *
 * Response:
 * {
 *   "status": "healthy" | "unhealthy",
 *   "services": {
 *     "mongodb": true,
 *     "embedder": true,
 *     "qdrant": true
 *   }
 * }
 */
router.get('/health', (req, res) => webhookController.handleHealthCheck(req, res));

export default router;

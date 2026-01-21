import { Request, Response } from 'express';
import { ingestionService } from './ingestion.service';
import { logger } from '../utils/logger';

/**
 * Webhook Controller
 *
 * Handles incoming webhook events for document changes.
 * Supports: document.created, document.updated, document.deleted
 *
 * Design decisions:
 * - Async processing: returns 202 immediately, processes in background
 * - Validation: ensures required fields are present
 * - Error handling: logs errors but doesn't fail webhook
 * - Idempotent: safe to receive duplicate events
 */

export interface WebhookPayload {
  event: 'document.created' | 'document.updated' | 'document.deleted';
  collection: string;
  documentId: string;
  timestamp?: string;
}

class WebhookController {
  /**
   * Handles webhook POST requests
   *
   * @param req - Express request
   * @param res - Express response
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WebhookPayload;

      // Validate payload
      const validation = this.validatePayload(payload);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Invalid payload',
          details: validation.errors,
        });
        return;
      }

      const { event, collection, documentId } = payload;

      logger.info(`Received webhook: ${event} for ${collection}/${documentId}`);

      // Return 202 Accepted immediately
      res.status(202).json({
        message: 'Webhook received, processing asynchronously',
        event,
        collection,
        documentId,
      });

      // Process asynchronously (don't await)
      this.processWebhook(event, collection, documentId).catch((error) => {
        logger.error('Webhook processing failed', error);
      });
    } catch (error) {
      logger.error('Webhook handler error', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Processes webhook event asynchronously
   */
  private async processWebhook(
    event: string,
    collection: string,
    documentId: string
  ): Promise<void> {
    try {
      if (event === 'document.deleted') {
        await ingestionService.deleteDocument(collection, documentId);
      } else {
        // Both created and updated trigger ingestion
        await ingestionService.ingestDocument(collection, documentId);
      }
    } catch (error) {
      logger.error(`Failed to process webhook ${event}`, error);
      // In production, consider adding retry logic or dead letter queue
    }
  }

  /**
   * Validates webhook payload
   */
  private validatePayload(payload: any): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!payload) {
      errors.push('Payload is required');
      return { valid: false, errors };
    }

    if (!payload.event) {
      errors.push('event field is required');
    } else if (
      !['document.created', 'document.updated', 'document.deleted'].includes(
        payload.event
      )
    ) {
      errors.push(
        'event must be one of: document.created, document.updated, document.deleted'
      );
    }

    if (!payload.collection || typeof payload.collection !== 'string') {
      errors.push('collection field is required and must be a string');
    }

    if (!payload.documentId || typeof payload.documentId !== 'string') {
      errors.push('documentId field is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Health check endpoint
   */
  async handleHealthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const health = await ingestionService.healthCheck();
      const allHealthy = Object.values(health).every((v) => v === true);

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        services: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
      });
    }
  }
}

export const webhookController = new WebhookController();

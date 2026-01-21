import { documentFetcher } from './document.fetcher';
import { textNormalizer } from './text.normalizer';
import { chunker } from './chunker';
import { embedder } from './embedder.interface';
import { ragQdrantService } from './qdrant.service';
import { logger } from '../utils/logger';

/**
 * RAG Ingestion Service
 *
 * Orchestrates the complete ingestion pipeline:
 * 1. Fetch document from MongoDB
 * 2. Normalize to text
 * 3. Chunk text
 * 4. Generate embeddings
 * 5. Store in Qdrant
 *
 * Design decisions:
 * - Idempotent: re-processing same document updates existing vectors
 * - Atomic: either all chunks succeed or none
 * - Handles create, update, and delete events
 * - Comprehensive error handling and logging
 */

export interface IngestionResult {
  success: boolean;
  collection: string;
  documentId: string;
  chunksProcessed?: number;
  error?: string;
}

class IngestionService {
  /**
   * Processes a document create/update event
   *
   * @param collection - Collection name
   * @param documentId - Document ID
   * @returns Ingestion result
   */
  async ingestDocument(collection: string, documentId: string): Promise<IngestionResult> {
    try {
      logger.info(`Starting ingestion for ${collection}/${documentId}`);

      // Step 1: Validate collection
      if (!documentFetcher.isCollectionAllowed(collection)) {
        const error = `Collection ${collection} not in RAG_COLLECTIONS`;
        logger.warn(error);
        return {
          success: false,
          collection,
          documentId,
          error,
        };
      }

      // Step 2: Fetch document
      const doc = await documentFetcher.fetchDocument(collection, documentId);

      if (!doc) {
        const error = 'Document not found or soft-deleted';
        logger.warn(error);
        return {
          success: false,
          collection,
          documentId,
          error,
        };
      }

      // Step 3: Normalize to text
      const normalizedText = textNormalizer.normalize(doc);
      logger.info(`Normalized text: ${normalizedText.text.length} characters`);

      // Step 4: Chunk text
      const chunks = chunker.chunk(normalizedText);
      logger.info(`Created ${chunks.length} chunks`);

      // Step 5: Generate embeddings
      logger.info('Generating embeddings...');
      const texts = chunks.map((c) => c.text);
      const embeddingResults = await embedder.embedBatch(texts);
      const embeddings = embeddingResults.map((r) => r.embedding);

      // Step 6: Upsert to Qdrant
      await ragQdrantService.upsertChunks(chunks, embeddings);

      logger.info(`Successfully ingested ${collection}/${documentId}`);

      return {
        success: true,
        collection,
        documentId,
        chunksProcessed: chunks.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Ingestion failed for ${collection}/${documentId}`, error);

      return {
        success: false,
        collection,
        documentId,
        error: errorMessage,
      };
    }
  }

  /**
   * Processes a document delete event
   *
   * @param collection - Collection name
   * @param documentId - Document ID
   * @returns Ingestion result
   */
  async deleteDocument(collection: string, documentId: string): Promise<IngestionResult> {
    try {
      logger.info(`Deleting vectors for ${collection}/${documentId}`);

      await ragQdrantService.deleteDocument(collection, documentId);

      logger.info(`Successfully deleted ${collection}/${documentId}`);

      return {
        success: true,
        collection,
        documentId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Deletion failed for ${collection}/${documentId}`, error);

      return {
        success: false,
        collection,
        documentId,
        error: errorMessage,
      };
    }
  }

  /**
   * Health check for all ingestion dependencies
   */
  async healthCheck(): Promise<{
    mongodb: boolean;
    embedder: boolean;
    qdrant: boolean;
  }> {
    const [mongodb, embedder, qdrant] = await Promise.all([
      dbConnection.healthCheck(),
      embedder.healthCheck(),
      ragQdrantService.healthCheck(),
    ]);

    return { mongodb, embedder, qdrant };
  }
}

export const ingestionService = new IngestionService();

// Import after class definition to avoid circular dependency
import { dbConnection } from './db.connection';

import { QdrantClient } from '@qdrant/js-client-rest';
import { TextChunk } from './chunker';
import { EmbeddingVector } from './embedder.interface';
import { logger } from '../utils/logger';

/**
 * Qdrant Service for RAG
 *
 * Manages vector storage operations for RAG ingestion.
 * Handles upsert, delete, and search operations.
 *
 * Design decisions:
 * - Deterministic vector IDs for idempotency
 * - Metadata storage for filtering and retrieval
 * - Batch operations for efficiency
 * - Collection-aware deletion
 */

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    collection: string;
    documentId: string;
    chunkIndex: number;
    totalChunks: number;
    text: string;
    updatedAt?: string;
    startChar: number;
    endChar: number;
  };
}

class RagQdrantService {
  private client: QdrantClient;
  private collectionName: string;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.collectionName = process.env.QDRANT_COLLECTION_NAME || 'documents';
    this.client = new QdrantClient({ url: qdrantUrl });
  }

  /**
   * Upserts vector points for text chunks
   * Idempotent: same chunk ID will update existing vector
   *
   * @param chunks - Text chunks to store
   * @param embeddings - Corresponding embedding vectors
   */
  async upsertChunks(chunks: TextChunk[], embeddings: EmbeddingVector[]): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings length mismatch');
    }

    const points: VectorPoint[] = chunks.map((chunk, index) => ({
      id: chunk.chunkId,
      vector: embeddings[index].vector,
      payload: {
        collection: chunk.metadata.collection,
        documentId: chunk.metadata.documentId,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        text: chunk.text,
        updatedAt: chunk.metadata.updatedAt?.toISOString(),
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
      },
    }));

    try {
      logger.info(`Upserting ${points.length} vectors to Qdrant`);

      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      });

      logger.info(`Successfully upserted ${points.length} vectors`);
    } catch (error) {
      logger.error('Failed to upsert vectors to Qdrant', error);
      throw error;
    }
  }

  /**
   * Deletes all vectors for a specific document
   * Uses filter to match collection and documentId
   *
   * @param collection - Collection name
   * @param documentId - Document ID
   */
  async deleteDocument(collection: string, documentId: string): Promise<void> {
    try {
      logger.info(`Deleting vectors for ${collection}/${documentId}`);

      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'collection',
              match: { value: collection },
            },
            {
              key: 'documentId',
              match: { value: documentId },
            },
          ],
        },
      });

      logger.info(`Successfully deleted vectors for ${collection}/${documentId}`);
    } catch (error) {
      logger.error(`Failed to delete vectors for ${collection}/${documentId}`, error);
      throw error;
    }
  }

  /**
   * Checks if Qdrant is healthy and collection exists
   */
  async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some((c) => c.name === this.collectionName);
    } catch (error) {
      logger.error('Qdrant health check failed', error);
      return false;
    }
  }

  /**
   * Gets collection info
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      logger.error('Failed to get collection info', error);
      throw error;
    }
  }
}

export const ragQdrantService = new RagQdrantService();

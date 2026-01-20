import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../utils/config";
import { logger } from "../utils/logger";

export interface DocumentChunk {
  id: string;
  vector: number[];
  payload: {
    text: string;
    source: string;
    chunkIndex: number;
  };
}

export interface SearchResult {
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
}

export class QdrantService {
  private client: QdrantClient;
  private collectionName: string;

  constructor() {
    this.client = new QdrantClient({ url: config.qdrantUrl });
    this.collectionName = config.qdrantCollectionName;
  }

  /**
   * Initialize collection if it doesn't exist
   */
  async initializeCollection(vectorSize: number = 768): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        logger.info(`Creating collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: vectorSize,
            distance: "Cosine",
          },
        });
        logger.info("Collection created successfully");
      } else {
        logger.info("Collection already exists");
      }
    } catch (error) {
      logger.error("Failed to initialize collection", error);
      throw new Error("Collection initialization failed");
    }
  }

  /**
   * Store document chunks with embeddings
   */
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      logger.info(`Storing ${chunks.length} chunks in Qdrant`);

      const points = chunks.map((chunk) => ({
        id: chunk.id,
        vector: chunk.vector,
        payload: chunk.payload,
      }));

      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      });

      logger.info("Chunks stored successfully");
    } catch (error) {
      logger.error("Failed to store chunks", error);
      throw new Error("Chunk storage failed");
    }
  }

  /**
   * Search for similar chunks
   */
  async searchSimilar(
    queryVector: number[],
    limit: number = config.topK,
  ): Promise<SearchResult[]> {
    try {
      logger.debug(`Searching for top ${limit} similar chunks`);

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        with_payload: true,
      });

      const results: SearchResult[] = searchResult
        .filter((result) => result.score >= config.similarityThreshold)
        .map((result) => ({
          text: result.payload?.text as string,
          source: result.payload?.source as string,
          chunkIndex: result.payload?.chunkIndex as number,
          score: result.score,
        }));

      logger.info(`Found ${results.length} chunks above threshold`);
      return results;
    } catch (error) {
      logger.error("Failed to search similar chunks", error);
      throw new Error("Similarity search failed");
    }
  }

  /**
   * Check if Qdrant is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      logger.error("Qdrant health check failed", error);
      return false;
    }
  }

  /**
   * Delete all points in collection (for testing/reset)
   */
  async clearCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      logger.info("Collection cleared");
    } catch (error) {
      logger.error("Failed to clear collection", error);
      throw new Error("Collection clear failed");
    }
  }
}

export const qdrantService = new QdrantService();

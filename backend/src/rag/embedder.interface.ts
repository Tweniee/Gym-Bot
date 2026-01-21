/**
 * Embedder Interface
 *
 * Abstract interface for embedding providers.
 * Allows pluggable embedding backends (Ollama, OpenAI, Cohere, etc.)
 *
 * Design decisions:
 * - Provider-agnostic interface
 * - Returns numeric vectors
 * - Supports batch embedding for efficiency
 * - Health check for provider availability
 */

export interface EmbeddingVector {
  vector: number[];
  dimensions: number;
}

export interface EmbeddingResult {
  text: string;
  embedding: EmbeddingVector;
}

/**
 * Abstract embedder interface
 * Implement this interface to add new embedding providers
 */
export interface IEmbedder {
  /**
   * Generates embedding for a single text
   *
   * @param text - Text to embed
   * @returns Embedding vector
   */
  embed(text: string): Promise<EmbeddingVector>;

  /**
   * Generates embeddings for multiple texts (batch operation)
   * More efficient than calling embed() multiple times
   *
   * @param texts - Array of texts to embed
   * @returns Array of embedding results
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Gets the dimension size of embeddings produced by this provider
   */
  getDimensions(): Promise<number>;

  /**
   * Checks if the embedding provider is available and healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Gets the name/identifier of this embedding provider
   */
  getProviderName(): string;
}

/**
 * Example implementation using Ollama
 * This uses the existing ollamaClient from the codebase
 */
import { ollamaClient } from '../llm/ollamaClient';
import { logger } from '../utils/logger';

export class OllamaEmbedder implements IEmbedder {
  private readonly model: string;
  private cachedDimensions: number | null = null;

  constructor(model?: string) {
    this.model = model || process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  }

  async embed(text: string): Promise<EmbeddingVector> {
    try {
      const embedding = await ollamaClient.generateEmbedding(text);

      return {
        vector: embedding,
        dimensions: embedding.length,
      };
    } catch (error) {
      logger.error('Ollama embedding failed', error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Ollama doesn't have native batch API, so we process sequentially
    // For production, consider implementing parallel processing with rate limiting
    const results: EmbeddingResult[] = [];

    for (const text of texts) {
      const embedding = await this.embed(text);
      results.push({ text, embedding });
    }

    return results;
  }

  async getDimensions(): Promise<number> {
    if (this.cachedDimensions !== null) {
      return this.cachedDimensions;
    }

    // Generate a test embedding to determine dimensions
    const testEmbedding = await this.embed('test');
    this.cachedDimensions = testEmbedding.dimensions;

    return this.cachedDimensions;
  }

  async healthCheck(): Promise<boolean> {
    return await ollamaClient.healthCheck();
  }

  getProviderName(): string {
    return `ollama:${this.model}`;
  }
}

// Export default embedder instance
export const embedder: IEmbedder = new OllamaEmbedder();

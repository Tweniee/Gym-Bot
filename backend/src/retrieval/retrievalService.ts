import { ollamaClient } from "../llm/ollamaClient";
import { qdrantService, SearchResult } from "../vector/qdrantClient";
import { logger } from "../utils/logger";

export class RetrievalService {
  /**
   * Retrieve relevant document chunks for a query
   */
  async retrieveRelevantChunks(query: string): Promise<SearchResult[]> {
    try {
      logger.info(`Retrieving chunks for query: "${query}"`);

      // Step 1: Generate embedding for query
      const queryEmbedding = await ollamaClient.generateEmbedding(query);

      // Step 2: Search for similar chunks in Qdrant
      const results = await qdrantService.searchSimilar(queryEmbedding);

      logger.info(`Retrieved ${results.length} relevant chunks`);
      return results;
    } catch (error) {
      logger.error("Retrieval failed", error);
      throw new Error("Failed to retrieve relevant chunks");
    }
  }

  /**
   * Format search results into context string
   */
  formatContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return "";
    }

    return results
      .map((result, index) => {
        return `[Document ${index + 1}] (Source: ${result.source}, Chunk: ${result.chunkIndex})\n${result.text}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Extract unique sources from search results
   */
  extractSources(results: SearchResult[]): string[] {
    const sourceSet = new Set<string>();

    results.forEach((result) => {
      sourceSet.add(`${result.source} (chunk ${result.chunkIndex})`);
    });

    return Array.from(sourceSet);
  }
}

export const retrievalService = new RetrievalService();

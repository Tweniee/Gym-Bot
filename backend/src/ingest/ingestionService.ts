import { v4 as uuidv4 } from "uuid";
import { documentProcessor } from "./documentProcessor";
import { ollamaClient } from "../llm/ollamaClient";
import { qdrantService, DocumentChunk } from "../vector/qdrantClient";
import { logger } from "../utils/logger";

export interface IngestionResult {
  success: boolean;
  filename: string;
  chunks: number;
  error?: string;
}

export class IngestionService {
  /**
   * Ingest a document: extract, chunk, embed, and store
   */
  async ingestDocument(
    filePath: string,
    filename: string,
  ): Promise<IngestionResult> {
    try {
      logger.info(`Starting ingestion for: ${filename}`);

      // Step 1: Extract text
      const text = await documentProcessor.extractText(filePath);
      logger.info(`Extracted ${text.length} characters`);

      if (text.length === 0) {
        return {
          success: false,
          filename,
          chunks: 0,
          error: "Document is empty",
        };
      }

      // Step 2: Chunk text
      const textChunks = documentProcessor.chunkText(text, filename);

      if (textChunks.length === 0) {
        return {
          success: false,
          filename,
          chunks: 0,
          error: "No chunks created",
        };
      }

      // Step 3: Generate embeddings for each chunk
      const documentChunks: DocumentChunk[] = [];

      for (const chunk of textChunks) {
        logger.debug(
          `Processing chunk ${chunk.chunkIndex + 1}/${textChunks.length}`,
        );

        const embedding = await ollamaClient.generateEmbedding(chunk.text);

        documentChunks.push({
          id: uuidv4(),
          vector: embedding,
          payload: {
            text: chunk.text,
            source: filename,
            chunkIndex: chunk.chunkIndex,
          },
        });
      }

      // Step 4: Store in Qdrant
      await qdrantService.storeChunks(documentChunks);

      logger.info(
        `Successfully ingested ${filename} with ${documentChunks.length} chunks`,
      );

      return {
        success: true,
        filename,
        chunks: documentChunks.length,
      };
    } catch (error) {
      logger.error(`Ingestion failed for ${filename}`, error);
      return {
        success: false,
        filename,
        chunks: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const ingestionService = new IngestionService();

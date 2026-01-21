import { NormalizedText } from './text.normalizer';
import { logger } from '../utils/logger';

/**
 * Text Chunker
 *
 * Splits normalized text into chunks suitable for embedding.
 * Only chunks if text exceeds size limits, otherwise keeps as single chunk.
 *
 * Design decisions:
 * - Configurable chunk size via environment
 * - Overlap between chunks for context preservation
 * - Line-aware splitting (doesn't break mid-line)
 * - Preserves metadata in each chunk
 * - Deterministic chunk IDs for idempotency
 */

export interface TextChunk {
  chunkId: string; // Format: <collection>_<documentId>_<chunkIndex>
  text: string;
  chunkIndex: number;
  totalChunks: number;
  metadata: {
    collection: string;
    documentId: string;
    updatedAt?: Date;
    startChar: number;
    endChar: number;
  };
}

class Chunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor() {
    this.chunkSize = parseInt(process.env.CHUNK_SIZE || '600', 10);
    this.chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '90', 10);
  }

  /**
   * Chunks normalized text into embedding-ready pieces
   *
   * @param normalizedText - Normalized document text
   * @returns Array of text chunks
   */
  chunk(normalizedText: NormalizedText): TextChunk[] {
    const { text, metadata } = normalizedText;

    logger.info(`Chunking document ${metadata.documentId} (${text.length} chars)`);

    // If text is small enough, return as single chunk
    if (text.length <= this.chunkSize) {
      return [
        {
          chunkId: this.generateChunkId(metadata.collection, metadata.documentId, 0),
          text,
          chunkIndex: 0,
          totalChunks: 1,
          metadata: {
            collection: metadata.collection,
            documentId: metadata.documentId,
            updatedAt: metadata.updatedAt,
            startChar: 0,
            endChar: text.length,
          },
        },
      ];
    }

    // Split into lines for line-aware chunking
    const lines = text.split('\n');
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    let startChar = 0;

    for (const line of lines) {
      const lineLength = line.length + 1; // +1 for newline

      // If adding this line exceeds chunk size, finalize current chunk
      if (currentLength + lineLength > this.chunkSize && currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n');
        chunks.push(
          this.createChunk(
            metadata.collection,
            metadata.documentId,
            chunks.length,
            chunkText,
            startChar,
            startChar + chunkText.length,
            metadata.updatedAt
          )
        );

        // Start new chunk with overlap
        const overlapLines = this.getOverlapLines(currentChunk);
        currentChunk = overlapLines;
        currentLength = overlapLines.join('\n').length;
        startChar = startChar + chunkText.length - currentLength;
      }

      currentChunk.push(line);
      currentLength += lineLength;
    }

    // Add final chunk if any content remains
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n');
      chunks.push(
        this.createChunk(
          metadata.collection,
          metadata.documentId,
          chunks.length,
          chunkText,
          startChar,
          startChar + chunkText.length,
          metadata.updatedAt
        )
      );
    }

    // Update totalChunks in all chunks
    const totalChunks = chunks.length;
    chunks.forEach((chunk) => {
      chunk.totalChunks = totalChunks;
    });

    logger.info(`Created ${totalChunks} chunks for document ${metadata.documentId}`);

    return chunks;
  }

  /**
   * Creates a chunk object
   */
  private createChunk(
    collection: string,
    documentId: string,
    chunkIndex: number,
    text: string,
    startChar: number,
    endChar: number,
    updatedAt?: Date
  ): TextChunk {
    return {
      chunkId: this.generateChunkId(collection, documentId, chunkIndex),
      text,
      chunkIndex,
      totalChunks: 0, // Will be updated later
      metadata: {
        collection,
        documentId,
        updatedAt,
        startChar,
        endChar,
      },
    };
  }

  /**
   * Generates deterministic chunk ID
   * Format: <collection>_<documentId>_<chunkIndex>
   */
  private generateChunkId(
    collection: string,
    documentId: string,
    chunkIndex: number
  ): string {
    return `${collection}_${documentId}_${chunkIndex}`;
  }

  /**
   * Gets lines for overlap from previous chunk
   * Takes last N characters worth of lines
   */
  private getOverlapLines(lines: string[]): string[] {
    if (this.chunkOverlap === 0 || lines.length === 0) {
      return [];
    }

    const overlapLines: string[] = [];
    let overlapLength = 0;

    // Take lines from the end until we reach overlap size
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (overlapLength + line.length > this.chunkOverlap) {
        break;
      }
      overlapLines.unshift(line);
      overlapLength += line.length + 1;
    }

    return overlapLines;
  }

  /**
   * Gets chunk size configuration
   */
  getChunkSize(): number {
    return this.chunkSize;
  }

  /**
   * Gets chunk overlap configuration
   */
  getChunkOverlap(): number {
    return this.chunkOverlap;
  }
}

export const chunker = new Chunker();

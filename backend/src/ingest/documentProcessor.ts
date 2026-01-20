import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import { config } from "../utils/config";
import { logger } from "../utils/logger";

export interface DocumentChunk {
  text: string;
  chunkIndex: number;
}

export class DocumentProcessor {
  /**
   * Extract text from file based on extension
   */
  async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case ".txt":
        case ".md":
          return await this.extractTextFile(filePath);
        case ".pdf":
          return await this.extractPdfFile(filePath);
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      logger.error(`Failed to extract text from ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Extract text from .txt or .md files
   */
  private async extractTextFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  }

  /**
   * Extract text from PDF files
   */
  private async extractPdfFile(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  /**
   * Chunk text into overlapping segments
   * Uses simple token approximation: 1 token ≈ 4 characters
   */
  chunkText(text: string, source: string): DocumentChunk[] {
    const charsPerToken = 4;
    const chunkSizeChars = config.chunkSize * charsPerToken;
    const overlapChars = config.chunkOverlap * charsPerToken;

    // Clean and normalize text
    const cleanText = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleanText.length === 0) {
      logger.warn(`Empty text for source: ${source}`);
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < cleanText.length) {
      // Calculate end index for this chunk
      let endIndex = startIndex + chunkSizeChars;

      // If not the last chunk, try to break at sentence boundary
      if (endIndex < cleanText.length) {
        const searchStart = Math.max(startIndex, endIndex - 200);
        const searchText = cleanText.substring(searchStart, endIndex + 200);

        // Look for sentence endings
        const sentenceEndings = [". ", ".\n", "! ", "!\n", "? ", "?\n"];
        let bestBreak = -1;

        for (const ending of sentenceEndings) {
          const pos = searchText.lastIndexOf(ending);
          if (pos > searchText.length / 2) {
            bestBreak = searchStart + pos + ending.length;
            break;
          }
        }

        if (bestBreak > startIndex) {
          endIndex = bestBreak;
        }
      }

      // Extract chunk
      const chunkText = cleanText.substring(startIndex, endIndex).trim();

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          chunkIndex,
        });
        chunkIndex++;
      }

      // Move start index forward with overlap
      startIndex = endIndex - overlapChars;

      // Ensure we make progress
      if (startIndex <= chunks[chunks.length - 1]?.text.length) {
        startIndex = endIndex;
      }
    }

    logger.info(`Created ${chunks.length} chunks from ${source}`);
    return chunks;
  }

  /**
   * Validate file type
   */
  isValidFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return [".txt", ".md", ".pdf"].includes(ext);
  }
}

export const documentProcessor = new DocumentProcessor();

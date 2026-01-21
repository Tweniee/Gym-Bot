import fs from 'fs/promises';
import path from 'path';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ingestionService } from './ingestionService';
import { documentProcessor } from './documentProcessor';

export class AutoIngestService {
  private documentsDir: string;
  private processedFiles: Set<string>;

  constructor(documentsDir: string = config.autoIngestDir) {
    this.documentsDir = documentsDir;
    this.processedFiles = new Set();
  }

  /**
   * Initialize the auto-ingest service and process all documents
   */
  async initialize(): Promise<void> {
    try {
      // Create documents directory if it doesn't exist
      await fs.mkdir(this.documentsDir, { recursive: true });
      logger.info(`Documents directory: ${this.documentsDir}`);

      // Process all files on startup
      await this.processAllFiles();

      logger.info('Auto-ingest service initialized');
    } catch (error) {
      logger.error('Failed to initialize auto-ingest service', error);
      throw error;
    }
  }

  /**
   * Process all files in the documents directory
   */
  private async processAllFiles(): Promise<void> {
    try {
      logger.info('Processing all files in documents directory...');

      const files = await fs.readdir(this.documentsDir);
      const validFiles = files.filter(
        (file) =>
          documentProcessor.isValidFileType(file) &&
          !file.startsWith('.') &&
          !file.startsWith('~')
      );

      if (validFiles.length === 0) {
        logger.info(
          'No documents found. Place PDF, CSV, TXT, or MD files in backend/documents/'
        );
        return;
      }

      logger.info(`Found ${validFiles.length} document(s) to ingest`);

      let successCount = 0;
      let failCount = 0;

      for (const file of validFiles) {
        const filePath = path.join(this.documentsDir, file);
        const success = await this.processFile(filePath, file);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      logger.info(`Ingestion complete: ${successCount} succeeded, ${failCount} failed`);
    } catch (error) {
      logger.error('Failed to process files', error);
    }
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string, filename: string): Promise<boolean> {
    try {
      logger.info(`Ingesting: ${filename}`);

      // Ingest the file
      const result = await ingestionService.ingestDocument(filePath, filename);

      if (result.success) {
        this.processedFiles.add(filename);
        logger.info(`✓ ${filename} (${result.chunks} chunks)`);
        return true;
      } else {
        logger.error(`✗ ${filename}: ${result.error}`);
        return false;
      }
    } catch (error) {
      logger.error(`✗ ${filename}:`, error);
      return false;
    }
  }

  /**
   * Get list of processed files
   */
  getProcessedFiles(): string[] {
    return Array.from(this.processedFiles);
  }

  /**
   * Clear processed files list (for testing)
   */
  clearProcessedFiles(): void {
    this.processedFiles.clear();
    logger.info('Cleared processed files list');
  }

  /**
   * Get documents directory path
   */
  getWatchDirectory(): string {
    return path.resolve(this.documentsDir);
  }
}

export const autoIngestService = new AutoIngestService();

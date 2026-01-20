import fs from 'fs/promises';
import path from 'path';
import { watch } from 'fs';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ingestionService } from './ingestionService';
import { documentProcessor } from './documentProcessor';

export class AutoIngestService {
  private watchDir: string;
  private processedFiles: Set<string>;
  private isProcessing: boolean;

  constructor(watchDir: string = config.autoIngestDir) {
    this.watchDir = watchDir;
    this.processedFiles = new Set();
    this.isProcessing = false;
  }

  /**
   * Initialize the auto-ingest service
   */
  async initialize(): Promise<void> {
    try {
      // Create watch directory if it doesn't exist
      await fs.mkdir(this.watchDir, { recursive: true });
      logger.info(`Auto-ingest directory created: ${this.watchDir}`);

      // Process existing files on startup
      await this.processExistingFiles();

      // Start watching for new files
      this.startWatching();

      logger.info('Auto-ingest service initialized');
    } catch (error) {
      logger.error('Failed to initialize auto-ingest service', error);
      throw error;
    }
  }

  /**
   * Process all existing files in the watch directory
   */
  private async processExistingFiles(): Promise<void> {
    try {
      logger.info('Processing existing files in watch directory...');

      const files = await fs.readdir(this.watchDir);
      const validFiles = files.filter((file) => documentProcessor.isValidFileType(file));

      if (validFiles.length === 0) {
        logger.info('No files found in watch directory');
        return;
      }

      logger.info(`Found ${validFiles.length} files to process`);

      for (const file of validFiles) {
        const filePath = path.join(this.watchDir, file);
        await this.processFile(filePath, file);
      }

      logger.info('Finished processing existing files');
    } catch (error) {
      logger.error('Failed to process existing files', error);
    }
  }

  /**
   * Start watching the directory for new files
   */
  private startWatching(): void {
    logger.info(`Watching directory: ${this.watchDir}`);

    const watcher = watch(
      this.watchDir,
      { recursive: false },
      async (eventType, filename) => {
        if (!filename) return;

        // Only process on 'rename' event (file added)
        if (eventType === 'rename') {
          const filePath = path.join(this.watchDir, filename);

          // Check if file exists (not deleted)
          try {
            await fs.access(filePath);

            // Wait a bit to ensure file is fully written
            setTimeout(async () => {
              await this.processFile(filePath, filename);
            }, 1000);
          } catch (error) {
            // File was deleted, ignore
          }
        }
      }
    );

    watcher.on('error', (error) => {
      logger.error('File watcher error', error);
    });
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string, filename: string): Promise<void> {
    // Skip if already processed
    if (this.processedFiles.has(filename)) {
      return;
    }

    // Skip if not a valid file type
    if (!documentProcessor.isValidFileType(filename)) {
      logger.warn(`Skipping invalid file type: ${filename}`);
      return;
    }

    // Skip hidden files and system files
    if (filename.startsWith('.') || filename.startsWith('~')) {
      return;
    }

    try {
      logger.info(`Auto-ingesting file: ${filename}`);

      // Mark as processing
      this.processedFiles.add(filename);

      // Ingest the file
      const result = await ingestionService.ingestDocument(filePath, filename);

      if (result.success) {
        logger.info(`Successfully auto-ingested ${filename} (${result.chunks} chunks)`);
      } else {
        logger.error(`Failed to auto-ingest ${filename}: ${result.error}`);
        // Remove from processed set so it can be retried
        this.processedFiles.delete(filename);
      }
    } catch (error) {
      logger.error(`Error processing file ${filename}`, error);
      // Remove from processed set so it can be retried
      this.processedFiles.delete(filename);
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
   * Get watch directory path
   */
  getWatchDirectory(): string {
    return path.resolve(this.watchDir);
  }
}

export const autoIngestService = new AutoIngestService();

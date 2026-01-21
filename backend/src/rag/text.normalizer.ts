import { FetchedDocument } from './document.fetcher';
import { logger } from '../utils/logger';

/**
 * Text Normalizer
 *
 * Converts arbitrary MongoDB documents into deterministic, LLM-friendly text.
 * Works generically without knowing the schema in advance.
 *
 * Design decisions:
 * - Deterministic output: same document always produces same text
 * - Preserves field names for context
 * - Handles nested objects and arrays
 * - Filters out internal MongoDB fields (_id, __v)
 * - Formats dates and special types consistently
 * - Produces human-readable text suitable for embeddings
 */

export interface NormalizedText {
  text: string;
  metadata: {
    collection: string;
    documentId: string;
    fieldCount: number;
    updatedAt?: Date;
  };
}

class TextNormalizer {
  /**
   * Converts a fetched document into normalized text
   *
   * @param doc - Fetched document from MongoDB
   * @returns Normalized text with metadata
   */
  normalize(doc: FetchedDocument): NormalizedText {
    logger.info(`Normalizing document ${doc._id} from ${doc.collection}`);

    const lines: string[] = [];

    // Header: collection and document ID
    lines.push(`Collection: ${doc.collection}`);
    lines.push(`Document ID: ${doc._id}`);
    lines.push('---');

    // Process all fields
    const fieldCount = this.processObject(doc.data, lines, 0);

    const text = lines.join('\n');

    return {
      text,
      metadata: {
        collection: doc.collection,
        documentId: doc._id,
        fieldCount,
        updatedAt: doc.updatedAt,
      },
    };
  }

  /**
   * Recursively processes an object and adds formatted lines
   *
   * @param obj - Object to process
   * @param lines - Array to append formatted lines to
   * @param depth - Current nesting depth
   * @returns Number of fields processed
   */
  private processObject(
    obj: Record<string, any>,
    lines: string[],
    depth: number
  ): number {
    let fieldCount = 0;
    const indent = '  '.repeat(depth);

    // Sort keys for deterministic output
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      // Skip internal MongoDB fields
      if (this.shouldSkipField(key)) {
        continue;
      }

      const value = obj[key];
      fieldCount++;

      if (value === null || value === undefined) {
        lines.push(`${indent}${key}: (empty)`);
      } else if (Array.isArray(value)) {
        lines.push(`${indent}${key}:`);
        this.processArray(value, lines, depth + 1);
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        lines.push(`${indent}${key}:`);
        fieldCount += this.processObject(value, lines, depth + 1);
      } else {
        const formattedValue = this.formatValue(value);
        lines.push(`${indent}${key}: ${formattedValue}`);
      }
    }

    return fieldCount;
  }

  /**
   * Processes an array and adds formatted lines
   */
  private processArray(arr: any[], lines: string[], depth: number): void {
    const indent = '  '.repeat(depth);

    if (arr.length === 0) {
      lines.push(`${indent}(empty array)`);
      return;
    }

    arr.forEach((item, index) => {
      if (item === null || item === undefined) {
        lines.push(`${indent}[${index}]: (empty)`);
      } else if (Array.isArray(item)) {
        lines.push(`${indent}[${index}]:`);
        this.processArray(item, lines, depth + 1);
      } else if (typeof item === 'object' && !(item instanceof Date)) {
        lines.push(`${indent}[${index}]:`);
        this.processObject(item, lines, depth + 1);
      } else {
        const formattedValue = this.formatValue(item);
        lines.push(`${indent}[${index}]: ${formattedValue}`);
      }
    });
  }

  /**
   * Formats a primitive value for display
   */
  private formatValue(value: any): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'boolean') {
      return value ? 'yes' : 'no';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'string') {
      // Truncate very long strings
      if (value.length > 1000) {
        return value.substring(0, 1000) + '... (truncated)';
      }
      return value;
    }

    // Fallback for other types
    return String(value);
  }

  /**
   * Determines if a field should be skipped
   * Skips internal MongoDB fields and version keys
   */
  private shouldSkipField(key: string): boolean {
    const skipFields = ['_id', '__v', '__t'];
    return skipFields.includes(key);
  }

  /**
   * Estimates token count (rough approximation)
   * Used for chunking decisions
   */
  estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export const textNormalizer = new TextNormalizer();

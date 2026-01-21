import { ObjectId } from 'mongodb';
import { dbConnection } from './db.connection';
import { logger } from '../utils/logger';

/**
 * Document Fetcher
 *
 * Retrieves documents from MongoDB collections dynamically.
 * Handles various ID formats and filters out soft-deleted records.
 *
 * Design decisions:
 * - Generic: works with any collection schema
 * - Supports both ObjectId and string IDs
 * - Filters soft-deleted records (deleted, isDeleted, active flags)
 * - Returns null for not found (not an error state)
 */

export interface FetchedDocument {
  _id: string;
  collection: string;
  data: Record<string, any>;
  updatedAt?: Date;
}

class DocumentFetcher {
  /**
   * Fetches a document from a specific collection
   *
   * @param collection - Collection name
   * @param documentId - Document ID (string or ObjectId)
   * @returns Fetched document or null if not found/deleted
   */
  async fetchDocument(
    collection: string,
    documentId: string
  ): Promise<FetchedDocument | null> {
    try {
      logger.info(`Fetching document ${documentId} from collection ${collection}`);

      const coll = await dbConnection.getCollection(collection);

      // Try to parse as ObjectId, fallback to string
      let query: any;
      try {
        query = { _id: new ObjectId(documentId) };
      } catch {
        query = { _id: documentId };
      }

      const doc = await coll.findOne(query);

      if (!doc) {
        logger.warn(`Document ${documentId} not found in ${collection}`);
        return null;
      }

      // Check for soft-delete flags
      if (this.isSoftDeleted(doc)) {
        logger.info(`Document ${documentId} is soft-deleted, skipping`);
        return null;
      }

      // Extract updatedAt if present (common field names)
      const updatedAt = this.extractUpdatedAt(doc);

      return {
        _id: documentId,
        collection,
        data: doc,
        updatedAt,
      };
    } catch (error) {
      logger.error(`Error fetching document ${documentId} from ${collection}`, error);
      throw error;
    }
  }

  /**
   * Checks if document is soft-deleted
   * Supports common soft-delete patterns:
   * - deleted: true
   * - isDeleted: true
   * - active: false
   * - status: 'deleted'
   */
  private isSoftDeleted(doc: Record<string, any>): boolean {
    if (doc.deleted === true || doc.isDeleted === true) {
      return true;
    }

    if (doc.active === false) {
      return true;
    }

    if (doc.status === 'deleted' || doc.status === 'inactive') {
      return true;
    }

    return false;
  }

  /**
   * Extracts updatedAt timestamp from document
   * Tries common field names: updatedAt, updated_at, modifiedAt, lastModified
   */
  private extractUpdatedAt(doc: Record<string, any>): Date | undefined {
    const candidates = [
      'updatedAt',
      'updated_at',
      'modifiedAt',
      'lastModified',
      'lastUpdated',
    ];

    for (const field of candidates) {
      if (doc[field]) {
        const value = doc[field];
        if (value instanceof Date) {
          return value;
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Validates if a collection is allowed for RAG ingestion
   * Based on RAG_COLLECTIONS environment variable
   */
  isCollectionAllowed(collection: string): boolean {
    const allowedCollections = (process.env.RAG_COLLECTIONS || '')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (allowedCollections.length === 0) {
      logger.warn('RAG_COLLECTIONS not configured, allowing all collections');
      return true;
    }

    return allowedCollections.includes(collection);
  }
}

export const documentFetcher = new DocumentFetcher();

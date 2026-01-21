import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';

/**
 * Database Connection Manager
 *
 * Handles MongoDB connection lifecycle with singleton pattern.
 * Supports dynamic collection access based on webhook events.
 *
 * Design decisions:
 * - Singleton pattern ensures single connection pool
 * - Lazy initialization on first use
 * - Graceful shutdown handling
 * - Type-safe collection access
 */
class DatabaseConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly uri: string;
  private readonly dbName: string;

  constructor() {
    this.uri = process.env.DB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.DB_NAME || 'app_db';
  }

  /**
   * Establishes connection to MongoDB
   * Idempotent - safe to call multiple times
   */
  async connect(): Promise<void> {
    if (this.client && this.db) {
      return; // Already connected
    }

    try {
      logger.info(`Connecting to MongoDB at ${this.uri}`);

      this.client = new MongoClient(this.uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(this.dbName);

      // Verify connection
      await this.db.admin().ping();

      logger.info(`Connected to MongoDB database: ${this.dbName}`);
    } catch (error) {
      logger.error('Failed to connect to MongoDB', error);
      throw new Error(
        `MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets a collection by name
   * Automatically connects if not already connected
   *
   * @param collectionName - Name of the collection to access
   * @returns MongoDB Collection instance
   */
  async getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
    if (!this.db) {
      await this.connect();
    }

    if (!this.db) {
      throw new Error('Database connection not established');
    }

    return this.db.collection<T>(collectionName);
  }

  /**
   * Checks if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('MongoDB health check failed', error);
      return false;
    }
  }

  /**
   * Gracefully closes the database connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Gets database instance (for advanced operations)
   */
  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

// Export singleton instance
export const dbConnection = new DatabaseConnection();

// Graceful shutdown handler
process.on('SIGINT', async () => {
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbConnection.disconnect();
  process.exit(0);
});

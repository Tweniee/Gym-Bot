/**
 * RAG Integration Examples
 *
 * This file contains example code for integrating the RAG webhook system
 * with your application.
 */

import { MongoClient, ChangeStream } from 'mongodb';
import mongoose from 'mongoose';

// ============================================================================
// Example 1: Direct HTTP Integration
// ============================================================================

/**
 * Simple function to notify RAG system of document changes
 */
async function notifyRAG(
  collection: string,
  documentId: string,
  event: 'document.created' | 'document.updated' | 'document.deleted'
): Promise<void> {
  const webhookUrl = process.env.RAG_WEBHOOK_URL || 'http://localhost:3000/rag/webhook';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        collection,
        documentId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(`RAG webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to notify RAG system:', error);
    // Don't throw - RAG sync failures shouldn't break your app
  }
}

// Usage in your application code
async function createProduct(productData: any) {
  // Your existing product creation logic
  const product = await db.collection('products').insertOne(productData);

  // Notify RAG system
  await notifyRAG('products', product.insertedId.toString(), 'document.created');

  return product;
}

// ============================================================================
// Example 2: Mongoose Middleware Integration
// ============================================================================

/**
 * Mongoose schema with automatic RAG synchronization
 */
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: Number,
  category: String,
  inStock: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// Auto-sync on create
productSchema.post('save', async function (doc) {
  // Only trigger on new documents
  if (this.isNew) {
    await notifyRAG('products', doc._id.toString(), 'document.created');
  }
});

// Auto-sync on update
productSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    await notifyRAG('products', doc._id.toString(), 'document.updated');
  }
});

productSchema.post('updateOne', async function () {
  const docId = this.getQuery()._id;
  if (docId) {
    await notifyRAG('products', docId.toString(), 'document.updated');
  }
});

// Auto-sync on delete
productSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await notifyRAG('products', doc._id.toString(), 'document.deleted');
  }
});

productSchema.post('deleteOne', async function () {
  const docId = this.getQuery()._id;
  if (docId) {
    await notifyRAG('products', docId.toString(), 'document.deleted');
  }
});

export const Product = mongoose.model('Product', productSchema);

// ============================================================================
// Example 3: MongoDB Change Streams (Recommended for Production)
// ============================================================================

/**
 * Sets up change stream listeners for automatic RAG synchronization
 * This is the most robust approach for production systems
 */
export class RAGSyncService {
  private client: MongoClient;
  private changeStreams: Map<string, ChangeStream> = new Map();

  constructor(mongoUri: string) {
    this.client = new MongoClient(mongoUri);
  }

  async start(collections: string[]): Promise<void> {
    await this.client.connect();
    console.log('Connected to MongoDB for RAG sync');

    const db = this.client.db();

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);

      // Create change stream
      const changeStream = collection.watch([], {
        fullDocument: 'updateLookup', // Get full document on updates
      });

      // Handle changes
      changeStream.on('change', async (change) => {
        try {
          await this.handleChange(collectionName, change);
        } catch (error) {
          console.error(`Error handling change for ${collectionName}:`, error);
        }
      });

      changeStream.on('error', (error) => {
        console.error(`Change stream error for ${collectionName}:`, error);
        // Implement reconnection logic here
      });

      this.changeStreams.set(collectionName, changeStream);
      console.log(`Watching collection: ${collectionName}`);
    }
  }

  private async handleChange(collection: string, change: any): Promise<void> {
    const eventMap: Record<string, string> = {
      insert: 'document.created',
      update: 'document.updated',
      replace: 'document.updated',
      delete: 'document.deleted',
    };

    const event = eventMap[change.operationType];
    if (!event) {
      return; // Ignore other operations
    }

    const documentId = change.documentKey._id.toString();

    console.log(`Change detected: ${event} in ${collection}/${documentId}`);

    await notifyRAG(collection, documentId, event as any);
  }

  async stop(): Promise<void> {
    for (const [name, stream] of this.changeStreams) {
      await stream.close();
      console.log(`Closed change stream for ${name}`);
    }
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Usage
const ragSync = new RAGSyncService('mongodb://localhost:27017/app_db');

// Start watching collections
ragSync.start(['products', 'users', 'orders']).catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  await ragSync.stop();
  process.exit(0);
});

// ============================================================================
// Example 4: Batch Synchronization
// ============================================================================

/**
 * Batch sync existing documents to RAG system
 * Useful for initial setup or re-indexing
 */
export async function batchSyncCollection(
  collection: string,
  batchSize: number = 100
): Promise<void> {
  const client = new MongoClient(process.env.DB_URI || 'mongodb://localhost:27017');
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'app_db');
  const coll = db.collection(collection);

  let processed = 0;
  let cursor = coll.find({});

  console.log(`Starting batch sync for collection: ${collection}`);

  while (await cursor.hasNext()) {
    const batch: any[] = [];

    // Collect batch
    for (let i = 0; i < batchSize && (await cursor.hasNext()); i++) {
      const doc = await cursor.next();
      if (doc) {
        batch.push(doc);
      }
    }

    // Process batch in parallel
    await Promise.all(
      batch.map(async (doc) => {
        try {
          await notifyRAG(collection, doc._id.toString(), 'document.created');
          processed++;
        } catch (error) {
          console.error(`Failed to sync document ${doc._id}:`, error);
        }
      })
    );

    console.log(`Processed ${processed} documents...`);

    // Rate limiting: wait between batches
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await client.close();
  console.log(`Batch sync complete. Processed ${processed} documents.`);
}

// Usage
// batchSyncCollection('products', 50).catch(console.error);

// ============================================================================
// Example 5: Express API Integration
// ============================================================================

import express from 'express';

const app = express();
app.use(express.json());

/**
 * Product CRUD endpoints with automatic RAG sync
 */

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // Mongoose middleware will automatically trigger RAG sync
    // But you can also do it manually:
    // await notifyRAG('products', product._id.toString(), 'document.created');

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Mongoose middleware handles RAG sync
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Mongoose middleware handles RAG sync
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============================================================================
// Example 6: Retry Logic with Exponential Backoff
// ============================================================================

/**
 * Enhanced RAG notification with retry logic
 */
async function notifyRAGWithRetry(
  collection: string,
  documentId: string,
  event: 'document.created' | 'document.updated' | 'document.deleted',
  maxRetries: number = 3
): Promise<void> {
  const webhookUrl = process.env.RAG_WEBHOOK_URL || 'http://localhost:3000/rag/webhook';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          collection,
          documentId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        return; // Success
      }

      console.warn(`RAG webhook attempt ${attempt + 1} failed: ${response.status}`);
    } catch (error) {
      console.error(`RAG webhook attempt ${attempt + 1} error:`, error);
    }

    // Exponential backoff
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(`Failed to notify RAG after ${maxRetries} attempts`);
}

// ============================================================================
// Example 7: Queue-Based Processing (Production Recommended)
// ============================================================================

/**
 * Using a message queue (e.g., Bull, BullMQ) for reliable RAG sync
 * This example uses BullMQ (install: npm install bullmq)
 */

// Uncomment if using BullMQ:
/*
import { Queue, Worker } from 'bullmq';

const ragQueue = new Queue('rag-sync', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// Add job to queue
export async function queueRAGSync(
  collection: string,
  documentId: string,
  event: string
): Promise<void> {
  await ragQueue.add('sync', {
    collection,
    documentId,
    event,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

// Worker to process queue
const worker = new Worker('rag-sync', async (job) => {
  const { collection, documentId, event } = job.data;
  await notifyRAG(collection, documentId, event);
}, {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

worker.on('completed', (job) => {
  console.log(`RAG sync completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`RAG sync failed: ${job?.id}`, err);
});
*/

// ============================================================================
// Example 8: Health Check Integration
// ============================================================================

/**
 * Check RAG system health before syncing
 */
async function isRAGHealthy(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/rag/health');
    const health = await response.json();
    return health.status === 'healthy';
  } catch {
    return false;
  }
}

// Use in your sync logic
async function safeNotifyRAG(
  collection: string,
  documentId: string,
  event: any
): Promise<void> {
  const healthy = await isRAGHealthy();

  if (!healthy) {
    console.warn('RAG system unhealthy, skipping sync');
    // Queue for later or log for manual intervention
    return;
  }

  await notifyRAG(collection, documentId, event);
}

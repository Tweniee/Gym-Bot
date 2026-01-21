# RAG Database Ingestion Module

## Quick Start

### 1. Configure Environment

```bash
# Add to backend/.env
DB_TYPE=mongodb
DB_URI=mongodb://localhost:27017
DB_NAME=app_db
RAG_COLLECTIONS=products,users,orders
```

### 2. Start MongoDB

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. Test the Webhook

```bash
# Create a test document in MongoDB
mongosh app_db --eval 'db.products.insertOne({
  name: "Test Product",
  description: "A test product for RAG",
  price: 99.99,
  category: "Electronics"
})'

# Trigger ingestion (replace with actual document ID)
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.created",
    "collection": "products",
    "documentId": "YOUR_DOCUMENT_ID_HERE"
  }'
```

## Module Structure

```
/rag
├── webhook.controller.ts    # HTTP webhook handler
├── db.connection.ts          # MongoDB connection manager
├── document.fetcher.ts       # Fetches documents from MongoDB
├── text.normalizer.ts        # Converts documents to text
├── chunker.ts                # Splits text into chunks
├── embedder.interface.ts     # Embedding provider interface
├── qdrant.service.ts         # Vector storage operations
├── ingestion.service.ts      # Orchestrates the pipeline
└── rag.routes.ts             # Express routes
```

## Key Features

✅ **Generic Schema Support**: Works with any MongoDB document structure
✅ **Idempotent**: Safe to process same document multiple times
✅ **Soft Delete Aware**: Automatically skips deleted records
✅ **Pluggable Embeddings**: Easy to swap embedding providers
✅ **Production Ready**: Error handling, logging, health checks
✅ **Webhook Based**: Real-time synchronization
✅ **Deterministic**: Same input always produces same output

## API Reference

### POST /rag/webhook

Ingests or deletes a document based on the event type.

**Request Body:**

```typescript
{
  event: 'document.created' | 'document.updated' | 'document.deleted';
  collection: string;
  documentId: string;
  timestamp?: string; // Optional
}
```

**Response:** `202 Accepted`

### GET /rag/health

Returns health status of all RAG services.

**Response:**

```typescript
{
  status: 'healthy' | 'unhealthy';
  services: {
    mongodb: boolean;
    embedder: boolean;
    qdrant: boolean;
  }
  timestamp: string;
}
```

## Configuration Options

| Variable                 | Default                     | Description                                  |
| ------------------------ | --------------------------- | -------------------------------------------- |
| `DB_TYPE`                | `mongodb`                   | Database type (currently only MongoDB)       |
| `DB_URI`                 | `mongodb://localhost:27017` | MongoDB connection string                    |
| `DB_NAME`                | `app_db`                    | Database name                                |
| `RAG_COLLECTIONS`        | _(empty)_                   | Comma-separated list of collections to index |
| `CHUNK_SIZE`             | `600`                       | Maximum characters per chunk                 |
| `CHUNK_OVERLAP`          | `90`                        | Overlap between chunks                       |
| `QDRANT_URL`             | `http://localhost:6333`     | Qdrant server URL                            |
| `QDRANT_COLLECTION_NAME` | `documents`                 | Qdrant collection name                       |
| `EMBEDDING_MODEL`        | `nomic-embed-text`          | Ollama embedding model                       |

## Integration Examples

### With Mongoose

```typescript
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
});

// Auto-sync on save
productSchema.post('save', async function () {
  await fetch('http://localhost:3000/rag/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'document.created',
      collection: 'products',
      documentId: this._id.toString(),
    }),
  });
});

// Auto-sync on delete
productSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await fetch('http://localhost:3000/rag/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'document.deleted',
        collection: 'products',
        documentId: doc._id.toString(),
      }),
    });
  }
});
```

### With Change Streams

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('app_db');
const collection = db.collection('products');

const changeStream = collection.watch();

changeStream.on('change', async (change) => {
  const eventMap = {
    insert: 'document.created',
    update: 'document.updated',
    replace: 'document.updated',
    delete: 'document.deleted',
  };

  const event = eventMap[change.operationType];
  if (!event) return;

  await fetch('http://localhost:3000/rag/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      collection: 'products',
      documentId: change.documentKey._id.toString(),
    }),
  });
});
```

## Extending

### Custom Embedding Provider

```typescript
// Create custom-embedder.ts
import { IEmbedder, EmbeddingVector, EmbeddingResult } from './embedder.interface';

export class CustomEmbedder implements IEmbedder {
  async embed(text: string): Promise<EmbeddingVector> {
    // Your implementation
    const vector = await yourEmbeddingAPI(text);
    return {
      vector,
      dimensions: vector.length,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Batch implementation
  }

  async getDimensions(): Promise<number> {
    return 768; // Your model's dimensions
  }

  async healthCheck(): Promise<boolean> {
    // Check if your service is available
    return true;
  }

  getProviderName(): string {
    return 'custom-provider';
  }
}

// Update embedder.interface.ts
export const embedder: IEmbedder = new CustomEmbedder();
```

### Custom Text Normalizer

Modify `text.normalizer.ts` to customize how documents are converted to text:

```typescript
// Add custom formatting for specific fields
private formatValue(value: any, fieldName?: string): string {
  // Custom handling for specific fields
  if (fieldName === 'price') {
    return `$${value.toFixed(2)}`;
  }

  // Default handling
  return String(value);
}
```

## Troubleshooting

### Issue: Webhook returns 400 Bad Request

**Cause**: Invalid payload format

**Solution**: Ensure payload includes `event`, `collection`, and `documentId` fields

### Issue: Document not being ingested

**Possible causes:**

1. Collection not in `RAG_COLLECTIONS` environment variable
2. Document is soft-deleted (has `deleted: true` or similar flag)
3. Document doesn't exist in MongoDB

**Solution**: Check logs for specific error messages

### Issue: Embeddings taking too long

**Cause**: Sequential processing of chunks

**Solution**: Implement parallel embedding generation with rate limiting

### Issue: MongoDB connection errors

**Cause**: Invalid connection string or MongoDB not running

**Solution**:

- Verify MongoDB is running: `docker ps | grep mongo`
- Test connection: `mongosh $DB_URI`
- Check `DB_URI` in `.env`

## Performance Tips

1. **Batch Processing**: Process multiple webhooks in batches
2. **Connection Pooling**: MongoDB client uses connection pooling by default
3. **Async Processing**: Webhooks return immediately, processing happens async
4. **Caching**: Cache embedding dimensions to avoid repeated test embeddings
5. **Indexing**: Add MongoDB indexes on frequently queried fields

## Security Checklist

- [ ] Add authentication to webhook endpoint
- [ ] Validate webhook signatures
- [ ] Implement rate limiting
- [ ] Sanitize document IDs
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Implement IP whitelisting if needed

## Testing

```bash
# Unit tests (add to package.json)
npm test

# Integration test
npm run test:integration

# Manual test
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"document.created","collection":"products","documentId":"test123"}'
```

## Monitoring

Key metrics to monitor:

- Webhook processing time
- Embedding generation latency
- Qdrant upsert duration
- MongoDB query performance
- Error rate
- Queue depth (if using message queue)

## License

MIT

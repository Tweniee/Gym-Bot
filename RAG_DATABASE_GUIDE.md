# RAG Database Ingestion System

## Overview

This is a production-ready RAG (Retrieval-Augmented Generation) ingestion system that reads data from MongoDB instead of files. It uses webhook-based real-time ingestion to keep your vector database synchronized with your application database.

## Architecture

```
Webhook Event → Document Fetcher → Text Normalizer → Chunker → Embedder → Qdrant
                      ↓                   ↓              ↓          ↓          ↓
                  MongoDB           Canonical Text   Chunks   Embeddings   Vectors
```

### Components

1. **Webhook Controller** (`webhook.controller.ts`)
   - Receives HTTP webhook events
   - Validates payloads
   - Triggers async processing

2. **Document Fetcher** (`document.fetcher.ts`)
   - Connects to MongoDB dynamically
   - Fetches documents by ID
   - Filters soft-deleted records

3. **Text Normalizer** (`text.normalizer.ts`)
   - Converts any document schema to LLM-friendly text
   - Works generically without schema knowledge
   - Deterministic output for idempotency

4. **Chunker** (`chunker.ts`)
   - Splits text into embedding-sized chunks
   - Line-aware splitting
   - Configurable size and overlap

5. **Embedder** (`embedder.interface.ts`)
   - Pluggable embedding provider interface
   - Default: Ollama implementation
   - Supports batch operations

6. **Qdrant Service** (`qdrant.service.ts`)
   - Vector storage operations
   - Idempotent upserts
   - Collection-aware deletion

7. **Ingestion Service** (`ingestion.service.ts`)
   - Orchestrates the complete pipeline
   - Error handling and logging
   - Health checks

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# MongoDB Configuration
DB_TYPE=mongodb
DB_URI=mongodb://localhost:27017
DB_NAME=app_db

# RAG Collections (comma-separated)
RAG_COLLECTIONS=products,users,orders

# Existing Qdrant/Ollama config remains the same
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents
EMBEDDING_MODEL=nomic-embed-text

# Chunking Configuration
CHUNK_SIZE=600
CHUNK_OVERLAP=90
```

### Supported Collections

Define which MongoDB collections should be indexed for RAG:

```bash
RAG_COLLECTIONS=products,users,orders,articles
```

Leave empty to allow all collections (not recommended for production).

## API Endpoints

### POST /rag/webhook

Receives document change events.

**Request:**

```json
{
  "event": "document.created",
  "collection": "products",
  "documentId": "507f1f77bcf86cd799439011"
}
```

**Events:**

- `document.created` - New document added
- `document.updated` - Existing document modified
- `document.deleted` - Document removed

**Response:** `202 Accepted`

```json
{
  "message": "Webhook received, processing asynchronously",
  "event": "document.created",
  "collection": "products",
  "documentId": "507f1f77bcf86cd799439011"
}
```

### GET /rag/health

Health check for RAG services.

**Response:** `200 OK` or `503 Service Unavailable`

```json
{
  "status": "healthy",
  "services": {
    "mongodb": true,
    "embedder": true,
    "qdrant": true
  },
  "timestamp": "2024-01-21T10:30:00.000Z"
}
```

## Usage Examples

### Testing with curl

```bash
# Create/Update event
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.created",
    "collection": "products",
    "documentId": "507f1f77bcf86cd799439011"
  }'

# Delete event
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.deleted",
    "collection": "products",
    "documentId": "507f1f77bcf86cd799439011"
  }'

# Health check
curl http://localhost:3000/rag/health
```

### Integrating with Your Application

#### Option 1: Direct HTTP Calls

```typescript
// After creating/updating a document
async function notifyRAG(
  collection: string,
  documentId: string,
  event: string,
) {
  await fetch("http://localhost:3000/rag/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      collection,
      documentId,
    }),
  });
}

// Usage
await Product.create({ name: "New Product", price: 99.99 });
await notifyRAG("products", productId, "document.created");
```

#### Option 2: MongoDB Change Streams

```typescript
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
const db = client.db("app_db");

// Watch specific collections
const collections = ["products", "users", "orders"];

for (const collectionName of collections) {
  const collection = db.collection(collectionName);
  const changeStream = collection.watch();

  changeStream.on("change", async (change) => {
    let event: string;
    let documentId: string;

    switch (change.operationType) {
      case "insert":
        event = "document.created";
        documentId = change.documentKey._id.toString();
        break;
      case "update":
      case "replace":
        event = "document.updated";
        documentId = change.documentKey._id.toString();
        break;
      case "delete":
        event = "document.deleted";
        documentId = change.documentKey._id.toString();
        break;
      default:
        return;
    }

    // Send webhook
    await fetch("http://localhost:3000/rag/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        collection: collectionName,
        documentId,
      }),
    });
  });
}
```

#### Option 3: Mongoose Middleware

```typescript
import mongoose from "mongoose";

// Add to your Mongoose schemas
productSchema.post("save", async function () {
  await notifyRAG("products", this._id.toString(), "document.created");
});

productSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    await notifyRAG("products", doc._id.toString(), "document.updated");
  }
});

productSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await notifyRAG("products", doc._id.toString(), "document.deleted");
  }
});
```

## How It Works

### 1. Document Normalization

Any MongoDB document is converted to canonical text format:

**Input (MongoDB document):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Laptop",
  "price": 999.99,
  "specs": {
    "cpu": "Intel i7",
    "ram": "16GB"
  },
  "tags": ["electronics", "computers"]
}
```

**Output (Normalized text):**

```
Collection: products
Document ID: 507f1f77bcf86cd799439011
---
name: Laptop
price: 999.99
specs:
  cpu: Intel i7
  ram: 16GB
tags:
  [0]: electronics
  [1]: computers
```

### 2. Chunking

Text is split into chunks if it exceeds `CHUNK_SIZE`:

- Chunk size: 600 characters (configurable)
- Overlap: 90 characters (configurable)
- Line-aware: doesn't break mid-line

### 3. Embedding

Each chunk is converted to a vector using the configured embedding model (default: Ollama nomic-embed-text).

### 4. Vector Storage

Vectors are stored in Qdrant with metadata:

```json
{
  "id": "products_507f1f77bcf86cd799439011_0",
  "vector": [0.123, -0.456, ...],
  "payload": {
    "collection": "products",
    "documentId": "507f1f77bcf86cd799439011",
    "chunkIndex": 0,
    "totalChunks": 1,
    "text": "Collection: products\n...",
    "updatedAt": "2024-01-21T10:30:00.000Z"
  }
}
```

## Idempotency

The system is fully idempotent:

- Same document ID always generates same vector IDs
- Re-processing updates existing vectors (upsert)
- Safe to receive duplicate webhook events
- Deterministic text normalization

## Soft Delete Handling

Documents with these flags are automatically skipped:

- `deleted: true`
- `isDeleted: true`
- `active: false`
- `status: 'deleted'` or `'inactive'`

## Production Considerations

### Scaling

1. **Horizontal Scaling**: Run multiple instances behind a load balancer
2. **Queue System**: Add Redis/RabbitMQ for webhook buffering
3. **Batch Processing**: Process multiple documents in parallel
4. **Rate Limiting**: Protect against webhook floods

### Monitoring

Monitor these metrics:

- Webhook processing time
- Embedding generation latency
- Qdrant upsert performance
- MongoDB connection health
- Failed ingestion count

### Error Handling

- Webhooks return 202 immediately (async processing)
- Errors are logged but don't fail the webhook
- Consider adding retry logic or dead letter queue
- Monitor logs for ingestion failures

### Security

- Add authentication to webhook endpoint
- Validate webhook signatures
- Use MongoDB connection pooling
- Implement rate limiting
- Sanitize document IDs

## Extending the System

### Adding New Embedding Providers

Implement the `IEmbedder` interface:

```typescript
import { IEmbedder, EmbeddingVector } from "./embedder.interface";

export class OpenAIEmbedder implements IEmbedder {
  async embed(text: string): Promise<EmbeddingVector> {
    // Your implementation
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Your implementation
  }

  async getDimensions(): Promise<number> {
    return 1536; // OpenAI ada-002
  }

  async healthCheck(): Promise<boolean> {
    // Your implementation
  }

  getProviderName(): string {
    return "openai:text-embedding-ada-002";
  }
}

// Use it
export const embedder: IEmbedder = new OpenAIEmbedder();
```

### Supporting Other Databases

The system is designed for extensibility. To add PostgreSQL or MySQL:

1. Create `db.connection.postgres.ts` or `db.connection.mysql.ts`
2. Implement the same interface as MongoDB connection
3. Update `document.fetcher.ts` to use the appropriate connection based on `DB_TYPE`

## Troubleshooting

### Webhook not processing

Check logs for:

- MongoDB connection errors
- Collection not in `RAG_COLLECTIONS`
- Document not found or soft-deleted

### Embeddings failing

- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check embedding model is pulled: `ollama pull nomic-embed-text`
- Review embedding service logs

### Qdrant errors

- Verify Qdrant is running: `curl http://localhost:6333/health`
- Check collection exists
- Verify vector dimensions match embedding model

## Testing

```bash
# Start services
docker-compose up -d

# Insert test document in MongoDB
mongosh app_db --eval 'db.products.insertOne({name: "Test Product", price: 99.99})'

# Get the document ID and trigger webhook
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.created",
    "collection": "products",
    "documentId": "YOUR_DOCUMENT_ID"
  }'

# Check Qdrant for vectors
curl http://localhost:6333/collections/documents/points/scroll
```

## License

MIT

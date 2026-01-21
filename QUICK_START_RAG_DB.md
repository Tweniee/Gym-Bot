# Quick Start: RAG Database Ingestion

Get your RAG database ingestion system up and running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- MongoDB shell (`mongosh`) installed (optional, for testing)

## Step 1: Setup Services

Run the automated setup script:

```bash
./setup-rag-db.sh
```

This will:

- Start Qdrant, Ollama, and MongoDB via Docker
- Pull required Ollama models (nomic-embed-text, llama3)
- Install Node.js dependencies
- Create sample data in MongoDB

## Step 2: Configure Environment

The setup script creates `backend/.env` from the example. Review and update if needed:

```bash
# MongoDB Configuration
DB_TYPE=mongodb
DB_URI=mongodb://localhost:27017
DB_NAME=app_db
RAG_COLLECTIONS=products,users,orders

# Existing configuration
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3
```

## Step 3: Start the Backend

```bash
cd backend
npm run dev
```

The server will start on `http://localhost:3000` with these endpoints:

- `POST /rag/webhook` - Webhook for document changes
- `GET /rag/health` - Health check for RAG services

## Step 4: Test the System

Run the test script:

```bash
./test-rag-webhook.sh
```

This will:

1. Create a test document in MongoDB
2. Send a `document.created` webhook
3. Verify the vector was stored in Qdrant
4. Test update and delete operations
5. Clean up test data

## Step 5: Integrate with Your App

### Option A: Direct HTTP Calls

```typescript
// After creating/updating a document
await fetch("http://localhost:3000/rag/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event: "document.created",
    collection: "products",
    documentId: productId,
  }),
});
```

### Option B: Mongoose Middleware

```typescript
productSchema.post("save", async function () {
  await fetch("http://localhost:3000/rag/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "document.created",
      collection: "products",
      documentId: this._id.toString(),
    }),
  });
});
```

### Option C: MongoDB Change Streams (Recommended)

See `backend/examples/rag-integration-examples.ts` for complete implementation.

## Manual Testing

### Create a document and trigger ingestion:

```bash
# 1. Create document in MongoDB
mongosh app_db --eval '
  const result = db.products.insertOne({
    name: "Gaming Keyboard",
    price: 79.99,
    category: "Accessories"
  });
  print(result.insertedId);
'

# 2. Send webhook (replace DOCUMENT_ID)
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.created",
    "collection": "products",
    "documentId": "DOCUMENT_ID"
  }'

# 3. Check Qdrant for the vector
curl http://localhost:6333/collections/documents/points/scroll | jq
```

### Update a document:

```bash
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.updated",
    "collection": "products",
    "documentId": "DOCUMENT_ID"
  }'
```

### Delete a document:

```bash
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.deleted",
    "collection": "products",
    "documentId": "DOCUMENT_ID"
  }'
```

## Verify Everything Works

### Check service health:

```bash
curl http://localhost:3000/rag/health | jq
```

Expected response:

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

### Check Qdrant collection:

```bash
curl http://localhost:6333/collections/documents | jq
```

### Check MongoDB data:

```bash
mongosh app_db --eval 'db.products.find().pretty()'
```

## Common Issues

### MongoDB connection error

**Problem:** `MongoDB connection failed`

**Solution:**

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Restart MongoDB
docker restart mongodb

# Check logs
docker logs mongodb
```

### Ollama embedding error

**Problem:** `Failed to generate embedding`

**Solution:**

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Pull the embedding model
docker exec ollama ollama pull nomic-embed-text

# Check Ollama logs
docker logs ollama
```

### Qdrant connection error

**Problem:** `Qdrant is not available`

**Solution:**

```bash
# Check if Qdrant is running
curl http://localhost:6333/health

# Restart Qdrant
docker restart qdrant

# Check logs
docker logs qdrant
```

### Webhook returns 400

**Problem:** `Invalid payload`

**Solution:** Ensure your webhook payload includes all required fields:

- `event` (must be: document.created, document.updated, or document.deleted)
- `collection` (string)
- `documentId` (string)

### Document not being ingested

**Possible causes:**

1. Collection not in `RAG_COLLECTIONS` environment variable
2. Document has soft-delete flag (`deleted: true`, `active: false`, etc.)
3. Document doesn't exist in MongoDB

**Solution:** Check server logs for specific error messages.

## Next Steps

1. **Read the full documentation:**
   - `RAG_DATABASE_GUIDE.md` - Complete system guide
   - `backend/src/rag/README.md` - Module documentation

2. **Explore integration examples:**
   - `backend/examples/rag-integration-examples.ts`

3. **Customize for your needs:**
   - Add custom embedding providers
   - Modify text normalization logic
   - Implement retry logic or message queues

4. **Production deployment:**
   - Add authentication to webhook endpoint
   - Implement rate limiting
   - Set up monitoring and alerting
   - Use message queue for reliability

## Architecture Overview

```
Your App → MongoDB → Webhook → RAG System → Qdrant
                                    ↓
                              Text Normalizer
                                    ↓
                                 Chunker
                                    ↓
                                 Embedder
                                    ↓
                              Vector Storage
```

## Key Features

✅ **Generic**: Works with any MongoDB schema
✅ **Idempotent**: Safe to process documents multiple times
✅ **Real-time**: Webhook-based synchronization
✅ **Scalable**: Modular architecture
✅ **Production-ready**: Error handling, logging, health checks
✅ **Extensible**: Pluggable embedding providers

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review server logs: `docker logs <container_name>`
3. Read the full documentation in `RAG_DATABASE_GUIDE.md`

## License

MIT

# RAG Database Ingestion System

A production-ready Retrieval-Augmented Generation (RAG) ingestion system that reads data from MongoDB instead of files, using webhook-based real-time synchronization.

## 🚀 Quick Start

```bash
# 1. Setup services and dependencies
./setup-rag-db.sh

# 2. Start the backend server
cd backend && npm run dev

# 3. Test the system
./test-rag-webhook.sh
```

That's it! Your RAG database ingestion system is now running.

## 📋 What's Included

### Core System

- **MongoDB Integration** - Reads from any MongoDB collection
- **Generic Schema Support** - Works without knowing schema in advance
- **Webhook-Based Sync** - Real-time document synchronization
- **Idempotent Processing** - Safe to process documents multiple times
- **Pluggable Embeddings** - Easy to swap embedding providers
- **Production Ready** - Error handling, logging, health checks

### Documentation

- 📖 **[RAG_DATABASE_GUIDE.md](RAG_DATABASE_GUIDE.md)** - Complete system guide
- ⚡ **[QUICK_START_RAG_DB.md](QUICK_START_RAG_DB.md)** - 5-minute quick start
- 📝 **[RAG_DB_IMPLEMENTATION_SUMMARY.md](RAG_DB_IMPLEMENTATION_SUMMARY.md)** - Technical details
- 🔧 **[backend/src/rag/README.md](backend/src/rag/README.md)** - Module documentation

### Examples & Scripts

- 💻 **[backend/examples/rag-integration-examples.ts](backend/examples/rag-integration-examples.ts)** - Integration code
- 🧪 **[test-rag-webhook.sh](test-rag-webhook.sh)** - Automated testing
- ⚙️ **[setup-rag-db.sh](setup-rag-db.sh)** - Automated setup

## 🏗️ Architecture

```
Your App → MongoDB → Webhook → RAG System → Qdrant
                                    ↓
                              Document Fetcher
                                    ↓
                              Text Normalizer
                                    ↓
                                 Chunker
                                    ↓
                                 Embedder
                                    ↓
                              Vector Storage
```

## 📦 Components

| Component              | Purpose                    | File                    |
| ---------------------- | -------------------------- | ----------------------- |
| **Webhook Controller** | Receives HTTP events       | `webhook.controller.ts` |
| **DB Connection**      | MongoDB connection manager | `db.connection.ts`      |
| **Document Fetcher**   | Fetches docs from MongoDB  | `document.fetcher.ts`   |
| **Text Normalizer**    | Converts docs to text      | `text.normalizer.ts`    |
| **Chunker**            | Splits text into chunks    | `chunker.ts`            |
| **Embedder**           | Generates embeddings       | `embedder.interface.ts` |
| **Qdrant Service**     | Vector storage             | `qdrant.service.ts`     |
| **Ingestion Service**  | Orchestrates pipeline      | `ingestion.service.ts`  |

## 🔌 API Endpoints

### POST /rag/webhook

Receives document change events.

```bash
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.created",
    "collection": "products",
    "documentId": "507f1f77bcf86cd799439011"
  }'
```

**Events:**

- `document.created` - New document
- `document.updated` - Updated document
- `document.deleted` - Deleted document

### GET /rag/health

Health check for RAG services.

```bash
curl http://localhost:3000/rag/health
```

## ⚙️ Configuration

Add to `backend/.env`:

```bash
# MongoDB Configuration
DB_TYPE=mongodb
DB_URI=mongodb://localhost:27017
DB_NAME=app_db
RAG_COLLECTIONS=products,users,orders

# Existing Qdrant/Ollama config
QDRANT_URL=http://localhost:6333
EMBEDDING_MODEL=nomic-embed-text
CHUNK_SIZE=600
CHUNK_OVERLAP=90
```

See `backend/.env.rag.example` for all configuration options.

## 🔗 Integration Examples

### Direct HTTP

```typescript
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

### Mongoose Middleware

```typescript
productSchema.post("save", async function () {
  await notifyRAG("products", this._id.toString(), "document.created");
});
```

### MongoDB Change Streams

```typescript
const changeStream = collection.watch();
changeStream.on("change", async (change) => {
  await notifyRAG(collectionName, documentId, event);
});
```

See `backend/examples/rag-integration-examples.ts` for complete implementations.

## 🧪 Testing

### Automated Test

```bash
./test-rag-webhook.sh
```

This will:

1. Create a test document in MongoDB
2. Send webhooks for create/update/delete
3. Verify vectors in Qdrant
4. Clean up test data

### Manual Test

```bash
# Create document
mongosh app_db --eval 'db.products.insertOne({name: "Test", price: 99.99})'

# Send webhook (replace DOCUMENT_ID)
curl -X POST http://localhost:3000/rag/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"document.created","collection":"products","documentId":"DOCUMENT_ID"}'

# Check Qdrant
curl http://localhost:6333/collections/documents/points/scroll | jq
```

## 📊 Example Transformation

### MongoDB Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Laptop Pro 15",
  "price": 1299.99,
  "specs": {
    "cpu": "Intel i7",
    "ram": "16GB"
  }
}
```

### Normalized Text

```
Collection: products
Document ID: 507f1f77bcf86cd799439011
---
name: Laptop Pro 15
price: 1299.99
specs:
  cpu: Intel i7
  ram: 16GB
```

### Vector in Qdrant

```json
{
  "id": "products_507f1f77bcf86cd799439011_0",
  "vector": [0.123, -0.456, ...],
  "payload": {
    "collection": "products",
    "documentId": "507f1f77bcf86cd799439011",
    "text": "Collection: products\n...",
    "chunkIndex": 0,
    "totalChunks": 1
  }
}
```

## ✨ Key Features

✅ **Generic Schema Support** - Works with any MongoDB document structure
✅ **Idempotent Processing** - Safe to process documents multiple times
✅ **Soft Delete Aware** - Automatically skips deleted records
✅ **Pluggable Embeddings** - Easy to swap providers (Ollama, OpenAI, Cohere)
✅ **Production Ready** - Error handling, logging, health checks
✅ **Webhook Based** - Real-time synchronization
✅ **Deterministic** - Same input always produces same output
✅ **Modular Architecture** - Clean separation of concerns
✅ **Comprehensive Docs** - Guides, examples, and API reference
✅ **Automated Setup** - Scripts for quick deployment

## 🛠️ Extending the System

### Custom Embedding Provider

```typescript
import { IEmbedder, EmbeddingVector } from "./embedder.interface";

export class OpenAIEmbedder implements IEmbedder {
  async embed(text: string): Promise<EmbeddingVector> {
    // Your implementation
  }
  // ... other methods
}

export const embedder: IEmbedder = new OpenAIEmbedder();
```

### Custom Text Normalization

Modify `text.normalizer.ts` to customize document-to-text conversion:

```typescript
private formatValue(value: any, fieldName?: string): string {
  if (fieldName === 'price') {
    return `$${value.toFixed(2)}`;
  }
  return String(value);
}
```

### Other Databases

Create new connection modules for PostgreSQL, MySQL, etc.:

- `db.connection.postgres.ts`
- `db.connection.mysql.ts`
- Update `document.fetcher.ts` based on `DB_TYPE`

## 🚨 Troubleshooting

### MongoDB connection error

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Restart MongoDB
docker restart mongodb
```

### Ollama embedding error

```bash
# Pull the embedding model
docker exec ollama ollama pull nomic-embed-text

# Check Ollama
curl http://localhost:11434/api/tags
```

### Qdrant connection error

```bash
# Check Qdrant health
curl http://localhost:6333/health

# Restart Qdrant
docker restart qdrant
```

See [QUICK_START_RAG_DB.md](QUICK_START_RAG_DB.md) for more troubleshooting tips.

## 📈 Production Considerations

### Scaling

- Run multiple instances behind load balancer
- Use message queue (Redis/BullMQ) for webhook buffering
- Implement batch processing
- Add rate limiting

### Monitoring

- Webhook processing time
- Embedding generation latency
- Qdrant upsert performance
- MongoDB query performance
- Error rate

### Security

- Add authentication to webhook endpoint
- Validate webhook signatures
- Implement rate limiting
- Sanitize document IDs
- Use MongoDB authentication
- Enable HTTPS in production

See [RAG_DATABASE_GUIDE.md](RAG_DATABASE_GUIDE.md) for detailed production guidance.

## 📚 Documentation

| Document                                                                                     | Description                                                                 |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [RAG_DATABASE_GUIDE.md](RAG_DATABASE_GUIDE.md)                                               | Complete system guide with architecture, API reference, and production tips |
| [QUICK_START_RAG_DB.md](QUICK_START_RAG_DB.md)                                               | 5-minute quick start guide                                                  |
| [RAG_DB_IMPLEMENTATION_SUMMARY.md](RAG_DB_IMPLEMENTATION_SUMMARY.md)                         | Technical implementation details and design decisions                       |
| [backend/src/rag/README.md](backend/src/rag/README.md)                                       | Module-level documentation                                                  |
| [backend/examples/rag-integration-examples.ts](backend/examples/rag-integration-examples.ts) | Integration code examples                                                   |

## 🤝 Contributing

This is an open-source project. Contributions are welcome!

Areas for contribution:

- Additional database support (PostgreSQL, MySQL)
- More embedding providers (OpenAI, Cohere, HuggingFace)
- Performance optimizations
- Additional integration examples
- Documentation improvements

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:

- [MongoDB](https://www.mongodb.com/) - Document database
- [Qdrant](https://qdrant.tech/) - Vector database
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [Express](https://expressjs.com/) - Web framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

## 📞 Support

- 📖 Read the [complete guide](RAG_DATABASE_GUIDE.md)
- 🐛 Check [troubleshooting](QUICK_START_RAG_DB.md#common-issues)
- 💬 Review [examples](backend/examples/rag-integration-examples.ts)
- 📝 Check server logs for detailed error messages

---

**Ready to get started?** Run `./setup-rag-db.sh` and you'll be up and running in minutes! 🚀

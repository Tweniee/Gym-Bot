# RAG Database Ingestion - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your Application                             │
│  (Express API, Mongoose Models, Business Logic)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ CRUD Operations
                             ▼
                    ┌────────────────┐
                    │    MongoDB     │
                    │   (Source DB)  │
                    └────────┬───────┘
                             │
                             │ Webhook Trigger
                             │ (HTTP POST)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RAG Ingestion System                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Webhook Controller (webhook.controller.ts)                  │  │
│  │  • Receives HTTP POST                                        │  │
│  │  • Validates payload                                         │  │
│  │  • Returns 202 Accepted                                      │  │
│  │  • Triggers async processing                                 │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Ingestion Service (ingestion.service.ts)                    │  │
│  │  • Orchestrates pipeline                                     │  │
│  │  • Error handling                                            │  │
│  │  • Logging                                                   │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│         ┌─────────────────┼─────────────────┐                       │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Fetch     │  │  Normalize   │  │    Chunk     │              │
│  │  Document   │→ │   to Text    │→ │     Text     │              │
│  └─────────────┘  └──────────────┘  └──────────────┘              │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  MongoDB    │  │     Text     │  │   Chunker    │              │
│  │ Connection  │  │  Normalizer  │  │              │              │
│  └─────────────┘  └──────────────┘  └──────────────┘              │
│                                             │                       │
│                                             ▼                       │
│                                      ┌──────────────┐              │
│                                      │   Generate   │              │
│                                      │  Embeddings  │              │
│                                      └──────┬───────┘              │
│                                             │                       │
│                                             ▼                       │
│                                      ┌──────────────┐              │
│                                      │   Embedder   │              │
│                                      │  (Ollama)    │              │
│                                      └──────┬───────┘              │
│                                             │                       │
│                                             ▼                       │
│                                      ┌──────────────┐              │
│                                      │    Upsert    │              │
│                                      │   Vectors    │              │
│                                      └──────┬───────┘              │
│                                             │                       │
│                                             ▼                       │
│                                      ┌──────────────┐              │
│                                      │   Qdrant     │              │
│                                      │   Service    │              │
│                                      └──────────────┘              │
└─────────────────────────────────────────┬───────────────────────────┘
                                          │
                                          ▼
                                 ┌────────────────┐
                                 │    Qdrant      │
                                 │  (Vector DB)   │
                                 └────────────────┘
```

## Component Interaction Flow

### 1. Document Creation/Update Flow

```
User Action
    │
    ▼
┌─────────────────┐
│  Create/Update  │
│   Document in   │
│    MongoDB      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Webhook   │
│  POST /rag/     │
│    webhook      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Webhook Controller                     │
│  1. Validate payload                    │
│  2. Return 202 Accepted                 │
│  3. Trigger async processing            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Document Fetcher                       │
│  1. Connect to MongoDB                  │
│  2. Fetch document by ID                │
│  3. Check soft-delete flags             │
│  4. Return document or null             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Text Normalizer                        │
│  1. Extract all fields                  │
│  2. Format nested objects               │
│  3. Handle arrays                       │
│  4. Create canonical text               │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Chunker                                │
│  1. Check if text > CHUNK_SIZE          │
│  2. Split on line boundaries            │
│  3. Add overlap between chunks          │
│  4. Generate chunk IDs                  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Embedder                               │
│  1. Call Ollama API                     │
│  2. Generate vector for each chunk      │
│  3. Return embeddings                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Qdrant Service                         │
│  1. Create vector points                │
│  2. Add metadata payload                │
│  3. Upsert to Qdrant                    │
│  4. Confirm success                     │
└─────────────────────────────────────────┘
```

### 2. Document Deletion Flow

```
User Action
    │
    ▼
┌─────────────────┐
│  Delete         │
│  Document from  │
│  MongoDB        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Webhook   │
│  event:         │
│  "document.     │
│   deleted"      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Webhook Controller                     │
│  1. Validate payload                    │
│  2. Return 202 Accepted                 │
│  3. Trigger async deletion              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Qdrant Service                         │
│  1. Build filter query                  │
│     - collection = "products"           │
│     - documentId = "123"                │
│  2. Delete all matching vectors         │
│  3. Confirm deletion                    │
└─────────────────────────────────────────┘
```

## Data Transformation Pipeline

### Example: Product Document

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: MongoDB Document                                       │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    "_id": "507f1f77bcf86cd799439011",                          │
│    "name": "Laptop Pro 15",                                    │
│    "description": "High-performance laptop...",                │
│    "price": 1299.99,                                           │
│    "category": "Electronics",                                  │
│    "specs": {                                                  │
│      "cpu": "Intel i7",                                        │
│      "ram": "16GB",                                            │
│      "storage": "512GB SSD"                                    │
│    },                                                          │
│    "tags": ["laptop", "electronics"],                         │
│    "inStock": true,                                            │
│    "createdAt": "2024-01-21T10:00:00Z"                        │
│  }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Normalized Text                                        │
├─────────────────────────────────────────────────────────────────┤
│  Collection: products                                           │
│  Document ID: 507f1f77bcf86cd799439011                         │
│  ---                                                            │
│  category: Electronics                                          │
│  createdAt: 2024-01-21T10:00:00.000Z                          │
│  description: High-performance laptop...                       │
│  inStock: yes                                                  │
│  name: Laptop Pro 15                                           │
│  price: 1299.99                                                │
│  specs:                                                        │
│    cpu: Intel i7                                               │
│    ram: 16GB                                                   │
│    storage: 512GB SSD                                          │
│  tags:                                                         │
│    [0]: laptop                                                 │
│    [1]: electronics                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Chunks (if text > CHUNK_SIZE)                         │
├─────────────────────────────────────────────────────────────────┤
│  Chunk 0:                                                       │
│  Collection: products                                           │
│  Document ID: 507f1f77bcf86cd799439011                         │
│  ---                                                            │
│  category: Electronics                                          │
│  ... (first 600 chars)                                         │
│                                                                 │
│  Chunk 1:                                                       │
│  ... (overlap + next 600 chars)                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Embeddings                                             │
├─────────────────────────────────────────────────────────────────┤
│  Chunk 0 → [0.123, -0.456, 0.789, ..., 0.234]  (768 dims)     │
│  Chunk 1 → [-0.234, 0.567, -0.890, ..., 0.123] (768 dims)     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Vector Points in Qdrant                               │
├─────────────────────────────────────────────────────────────────┤
│  Point 1:                                                       │
│  {                                                              │
│    "id": "products_507f1f77bcf86cd799439011_0",               │
│    "vector": [0.123, -0.456, ...],                            │
│    "payload": {                                                │
│      "collection": "products",                                 │
│      "documentId": "507f1f77bcf86cd799439011",                │
│      "chunkIndex": 0,                                          │
│      "totalChunks": 1,                                         │
│      "text": "Collection: products\n...",                      │
│      "updatedAt": "2024-01-21T10:00:00.000Z",                 │
│      "startChar": 0,                                           │
│      "endChar": 245                                            │
│    }                                                           │
│  }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Patterns

### Pattern 1: Direct HTTP Integration

```
┌──────────────┐
│  Your API    │
│  Endpoint    │
└──────┬───────┘
       │
       │ 1. Create/Update Document
       ▼
┌──────────────┐
│   MongoDB    │
└──────┬───────┘
       │
       │ 2. Send Webhook
       ▼
┌──────────────┐
│ RAG Webhook  │
│   Endpoint   │
└──────────────┘
```

### Pattern 2: Mongoose Middleware

```
┌──────────────┐
│  Mongoose    │
│   Model      │
└──────┬───────┘
       │
       │ post('save')
       ▼
┌──────────────┐
│  Middleware  │
│   Hook       │
└──────┬───────┘
       │
       │ Auto-send Webhook
       ▼
┌──────────────┐
│ RAG Webhook  │
│   Endpoint   │
└──────────────┘
```

### Pattern 3: Change Streams (Recommended)

```
┌──────────────┐
│   MongoDB    │
│  Collection  │
└──────┬───────┘
       │
       │ Change Stream
       ▼
┌──────────────┐
│   Watcher    │
│   Service    │
└──────┬───────┘
       │
       │ On Change Event
       ▼
┌──────────────┐
│ RAG Webhook  │
│   Endpoint   │
└──────────────┘
```

## Deployment Architecture

### Development

```
┌─────────────────────────────────────────────────────────────┐
│  Local Machine                                              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Qdrant  │  │  Ollama  │  │ MongoDB  │  │  Backend │  │
│  │  :6333   │  │  :11434  │  │  :27017  │  │  :3000   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│       │              │              │              │       │
│       └──────────────┴──────────────┴──────────────┘       │
│                    Docker Network                          │
└─────────────────────────────────────────────────────────────┘
```

### Production

```
┌─────────────────────────────────────────────────────────────────┐
│  Cloud Infrastructure                                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Load Balancer                                            │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                         │
│         ┌─────────────┼─────────────┐                          │
│         │             │             │                          │
│         ▼             ▼             ▼                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ Backend  │  │ Backend  │  │ Backend  │                    │
│  │Instance 1│  │Instance 2│  │Instance 3│                    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
│       │             │             │                           │
│       └─────────────┼─────────────┘                           │
│                     │                                         │
│         ┌───────────┼───────────┐                            │
│         │           │           │                            │
│         ▼           ▼           ▼                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ MongoDB  │  │  Qdrant  │  │  Ollama  │                  │
│  │ Cluster  │  │ Cluster  │  │ Cluster  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Message Queue (Optional)                            │  │
│  │  Redis/RabbitMQ for webhook buffering               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────┐
│  Webhook Event  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Validation                     │
│  ✓ Required fields present?     │
│  ✓ Valid event type?            │
│  ✓ Valid collection?            │
└────────┬────────────────────────┘
         │
         ├─── Invalid ──→ Return 400 Bad Request
         │
         ▼ Valid
┌─────────────────────────────────┐
│  Return 202 Accepted            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Async Processing               │
│  Try:                           │
│    1. Fetch document            │
│    2. Normalize                 │
│    3. Chunk                     │
│    4. Embed                     │
│    5. Upsert                    │
│  Catch:                         │
│    - Log error                  │
│    - Don't throw               │
│    - Consider retry/DLQ         │
└─────────────────────────────────┘
```

## Monitoring Points

```
┌─────────────────────────────────────────────────────────────┐
│  Metrics to Monitor                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Webhook Endpoint                                        │
│     • Request rate                                          │
│     • Response time                                         │
│     • Error rate (4xx, 5xx)                                │
│                                                             │
│  2. MongoDB Connection                                      │
│     • Connection pool usage                                 │
│     • Query latency                                         │
│     • Connection errors                                     │
│                                                             │
│  3. Embedding Generation                                    │
│     • Embedding latency                                     │
│     • Ollama API errors                                     │
│     • Queue depth (if using queue)                         │
│                                                             │
│  4. Qdrant Operations                                       │
│     • Upsert latency                                        │
│     • Delete latency                                        │
│     • Storage usage                                         │
│                                                             │
│  5. Pipeline Metrics                                        │
│     • End-to-end processing time                           │
│     • Success rate                                          │
│     • Documents processed per minute                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Security Considerations                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Network Layer                                           │
│     • HTTPS only in production                              │
│     • IP whitelisting                                       │
│     • VPC/Private network                                   │
│                                                             │
│  2. Authentication                                          │
│     • Webhook signature validation                          │
│     • API key authentication                                │
│     • JWT tokens                                            │
│                                                             │
│  3. Authorization                                           │
│     • Collection-level access control                       │
│     • Rate limiting per client                              │
│                                                             │
│  4. Data Protection                                         │
│     • MongoDB authentication                                │
│     • Encrypted connections                                 │
│     • PII handling                                          │
│                                                             │
│  5. Input Validation                                        │
│     • Payload schema validation                             │
│     • Document ID sanitization                              │
│     • Collection name validation                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────────┐
│  Horizontal Scaling                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Multiple Backend Instances                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Backend 1 │  │Backend 2 │  │Backend 3 │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │             │             │                        │
│       └─────────────┴─────────────┘                        │
│                     │                                      │
│                     ▼                                      │
│              ┌─────────────┐                               │
│              │   Shared    │                               │
│              │  MongoDB    │                               │
│              │   Qdrant    │                               │
│              └─────────────┘                               │
│                                                            │
│  Benefits:                                                 │
│  • Load distribution                                       │
│  • High availability                                       │
│  • No shared state                                         │
│  • Stateless processing                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

This architecture provides a robust, scalable, and maintainable RAG ingestion system that can grow with your needs.

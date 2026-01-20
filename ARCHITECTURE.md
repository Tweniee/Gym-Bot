# Architecture Documentation

## System Overview

This RAG chatbot implements a three-stage pipeline: **Ingestion → Retrieval → Generation**

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│  Document Upload → Text Extraction → Chunking →             │
│  Embedding Generation → Vector Storage                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    RETRIEVAL PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│  User Query → Query Embedding → Similarity Search →         │
│  Threshold Filtering → Context Formatting                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   GENERATION PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│  Context + Query → Prompt Construction → LLM Generation →   │
│  Response + Source Attribution                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Document Processor (`src/ingest/documentProcessor.ts`)

**Responsibility**: Extract and chunk text from documents

**Key Methods**:

- `extractText(filePath)`: Handles .txt, .md, .pdf files
- `chunkText(text, source)`: Creates overlapping chunks

**Chunking Strategy**:

- Target size: 600 tokens (~2400 characters)
- Overlap: 90 tokens (~360 characters)
- Smart boundary detection at sentence endings
- Prevents orphaned fragments

**Why this approach?**

- 600 tokens balances context vs. precision
- 15% overlap ensures no information loss at boundaries
- Sentence-aware splitting maintains semantic coherence

### 2. Ollama Client (`src/llm/ollamaClient.ts`)

**Responsibility**: Interface with local Ollama server

**Key Methods**:

- `generateEmbedding(text)`: Creates 768-dim vectors using nomic-embed-text
- `generateChatCompletion(prompt)`: Generates answers using llama3
- `healthCheck()`: Verifies models are available

**Why Ollama?**

- Fully open-source
- Easy model management
- REST API for embeddings and chat
- Supports GPU acceleration
- No external dependencies

**Why nomic-embed-text?**

- Open-source embedding model
- 768 dimensions (good balance)
- Optimized for retrieval tasks
- Fast inference

**Why llama3?**

- State-of-the-art open-source LLM
- Strong instruction following
- Good at staying grounded in context
- Available in multiple sizes (8B, 70B)

### 3. Qdrant Service (`src/vector/qdrantClient.ts`)

**Responsibility**: Vector storage and similarity search

**Key Methods**:

- `initializeCollection(vectorSize)`: Creates collection with cosine similarity
- `storeChunks(chunks)`: Batch upsert of vectors
- `searchSimilar(queryVector, limit)`: Top-K retrieval with threshold

**Why Qdrant?**

- Open-source vector database
- Docker-native deployment
- Excellent performance
- Rich filtering capabilities
- REST and gRPC APIs

**Similarity Metric**: Cosine similarity

- Range: -1 to 1 (higher = more similar)
- Ideal for normalized embeddings
- Computationally efficient

**Threshold**: 0.7 (configurable)

- Filters out low-relevance chunks
- Prevents hallucination from weak matches
- Tunable based on use case

### 4. Ingestion Service (`src/ingest/ingestionService.ts`)

**Responsibility**: Orchestrate document ingestion pipeline

**Pipeline Steps**:

1. Extract text from uploaded file
2. Chunk text with overlap
3. Generate embeddings for each chunk (sequential to avoid rate limits)
4. Store vectors in Qdrant with metadata

**Metadata Stored**:

- `text`: The actual chunk content
- `source`: Original filename
- `chunkIndex`: Position in document

**Why sequential embedding?**

- Prevents overwhelming Ollama
- More predictable resource usage
- Easy to add progress tracking

### 5. Retrieval Service (`src/retrieval/retrievalService.ts`)

**Responsibility**: Find relevant chunks for queries

**Pipeline Steps**:

1. Embed user query
2. Search Qdrant for top-K similar chunks
3. Filter by similarity threshold
4. Format context for LLM

**Context Formatting**:

```
[Document 1] (Source: file.pdf, Chunk: 0)
<chunk text>

---

[Document 2] (Source: file.pdf, Chunk: 3)
<chunk text>
```

**Why this format?**

- Clear document boundaries
- Source attribution for citations
- Easy for LLM to parse
- Maintains traceability

### 6. Chat Service (`src/chat/chatService.ts`)

**Responsibility**: Generate answers using RAG

**System Prompt Design**:

```
You are a helpful assistant that answers questions based ONLY on the provided context documents.

CRITICAL RULES:
1. Answer ONLY using information from the context documents
2. If the answer is not in the context, respond with: "I don't know"
3. Do NOT use your general knowledge
4. Do NOT make assumptions or inferences
5. Do NOT hallucinate or fabricate information
6. If uncertain, say "I don't know"
7. Keep answers concise and factual
8. Quote or reference specific parts of context
```

**Why this prompt?**

- Explicit constraints prevent hallucination
- "I don't know" fallback ensures honesty
- Emphasizes grounding in context
- Tested to work well with llama3

**Prompt Structure**:

```
<SYSTEM_PROMPT>

CONTEXT DOCUMENTS:
<retrieved chunks>

QUESTION: <user question>

ANSWER:
```

**Edge Cases**:

- No relevant chunks found → Return "I don't know" immediately
- Empty context → Inform user no documents available
- Ambiguous query → LLM answers based on available context

## Data Flow

### Ingestion Flow

```
User uploads file
      ↓
Express/Multer saves to disk
      ↓
DocumentProcessor extracts text
      ↓
DocumentProcessor chunks text (with overlap)
      ↓
For each chunk:
  OllamaClient generates embedding (768-dim)
      ↓
QdrantService stores vectors + metadata
      ↓
Cleanup: Delete uploaded file
      ↓
Return success + chunk count
```

### Chat Flow

```
User sends question
      ↓
OllamaClient embeds question
      ↓
QdrantService searches for top-K similar chunks
      ↓
Filter chunks by similarity threshold
      ↓
RetrievalService formats context
      ↓
ChatService builds prompt (system + context + question)
      ↓
OllamaClient generates answer
      ↓
Return answer + sources
```

## Configuration

All configuration in `src/utils/config.ts`:

```typescript
{
  // Server
  port: 3000,

  // Ollama
  ollamaBaseUrl: 'http://localhost:11434',
  embeddingModel: 'nomic-embed-text',
  chatModel: 'llama3',

  // Qdrant
  qdrantUrl: 'http://localhost:6333',
  qdrantCollectionName: 'documents',

  // RAG
  chunkSize: 600,        // tokens
  chunkOverlap: 90,      // tokens (15%)
  topK: 5,               // chunks to retrieve
  similarityThreshold: 0.7,

  // Upload
  maxFileSize: 10485760, // 10MB
}
```

## Design Decisions

### Why Express over NestJS?

- Simpler, more transparent
- Less boilerplate
- Easier to understand for contributors
- Sufficient for this use case

### Why TypeScript?

- Type safety prevents runtime errors
- Better IDE support
- Self-documenting code
- Industry standard for Node.js

### Why modular service architecture?

- Clear separation of concerns
- Easy to test individual components
- Simple to extend or replace parts
- Follows SOLID principles

### Why synchronous embedding generation?

- Simpler implementation
- Predictable resource usage
- Easier error handling
- Can be made async later if needed

### Why no conversation memory?

- Keeps implementation simple
- Stateless = easier to scale
- Can be added as enhancement
- Not required for basic RAG

## Security Considerations

### Input Validation

- File type whitelist (.txt, .md, .pdf only)
- File size limit (10MB default)
- Question string validation
- Sanitized error messages

### File Handling

- Temporary storage with unique names
- Automatic cleanup after processing
- No arbitrary file execution
- Isolated upload directory

### API Security

- CORS enabled (configure for production)
- No authentication (add for production)
- Rate limiting recommended
- Input sanitization

### LLM Safety

- Strict system prompt prevents jailbreaking
- No code execution in responses
- Grounded in provided context only
- Timeout protection (2 min)

## Performance Characteristics

### Ingestion

- **Time**: ~1-2 seconds per chunk (embedding generation)
- **Bottleneck**: Ollama embedding API
- **Optimization**: Batch embedding API (if available)

### Retrieval

- **Time**: ~100-200ms for top-K search
- **Bottleneck**: Qdrant search (minimal)
- **Optimization**: Already very fast

### Generation

- **Time**: ~5-30 seconds (depends on answer length)
- **Bottleneck**: LLM inference
- **Optimization**: Use smaller model or GPU acceleration

### Memory Usage

- **Ollama**: 4-8GB (llama3:8b)
- **Qdrant**: ~1GB per 1M vectors
- **Node.js**: ~100-200MB

## Scalability

### Current Limitations

- Single-threaded Node.js
- Synchronous embedding generation
- No caching
- No load balancing

### Scaling Strategies

1. **Horizontal**: Multiple backend instances + load balancer
2. **Caching**: Redis for embeddings and responses
3. **Queue**: Bull/BullMQ for async ingestion
4. **Database**: PostgreSQL for metadata
5. **CDN**: Static assets and responses

## Testing Strategy

### Unit Tests

- Document processor chunking logic
- Prompt construction
- Context formatting
- Configuration validation

### Integration Tests

- Ollama client connectivity
- Qdrant operations
- End-to-end ingestion
- End-to-end chat

### Manual Testing

- Upload various file types
- Test edge cases (empty files, large files)
- Verify source attribution
- Test "I don't know" responses

## Monitoring

### Key Metrics

- Request latency (p50, p95, p99)
- Embedding generation time
- LLM response time
- Error rates
- Document ingestion success rate

### Logging

- Structured logging with timestamps
- Log levels: debug, info, warn, error
- Request/response logging
- Error stack traces

### Health Checks

- `/api/health` endpoint
- Ollama connectivity
- Qdrant connectivity
- Model availability

## Future Enhancements

### Short-term

- [ ] Streaming responses (SSE)
- [ ] Conversation history (Redis)
- [ ] Better error messages
- [ ] Progress tracking for ingestion

### Medium-term

- [ ] Multi-collection support
- [ ] Advanced chunking (semantic)
- [ ] Reranking with cross-encoders
- [ ] Web UI (React)

### Long-term

- [ ] Multi-user support with auth
- [ ] Fine-tuned embedding model
- [ ] Hybrid search (vector + keyword)
- [ ] Multi-language support

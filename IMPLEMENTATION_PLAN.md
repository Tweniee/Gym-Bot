# Implementation Plan

## Step-by-Step Guide to Building the RAG Chatbot

This document provides a detailed implementation plan for building the RAG chatbot from scratch.

---

## Phase 1: Infrastructure Setup

### Step 1.1: Initialize Project Structure

```bash
# Create project directory
mkdir rag-chatbot
cd rag-chatbot

# Create backend structure
mkdir -p backend/src/{ingest,retrieval,vector,llm,chat,utils}
mkdir -p backend/uploads

# Initialize git
git init
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo "uploads/" >> .gitignore
echo ".env" >> .gitignore
```

### Step 1.2: Set Up Docker Infrastructure

Create `docker-compose.yml`:

- Qdrant service on port 6333
- Ollama service on port 11434
- Persistent volumes for data

```bash
docker-compose up -d
```

### Step 1.3: Pull Ollama Models

```bash
# Pull embedding model
docker exec -it ollama ollama pull nomic-embed-text

# Pull chat model
docker exec -it ollama ollama pull llama3

# Verify models
docker exec -it ollama ollama list
```

**Expected output**:

```
NAME                    ID              SIZE
llama3:latest          a6990ed6be41    4.7 GB
nomic-embed-text:latest 0a109f422b47   274 MB
```

---

## Phase 2: Backend Foundation

### Step 2.1: Initialize Node.js Project

```bash
cd backend
npm init -y
```

### Step 2.2: Install Dependencies

```bash
# Production dependencies
npm install express multer pdf-parse dotenv cors axios @qdrant/js-client-rest uuid

# Development dependencies
npm install -D typescript tsx @types/node @types/express @types/multer @types/pdf-parse @types/cors @types/uuid
```

### Step 2.3: Configure TypeScript

Create `tsconfig.json` with strict mode enabled.

### Step 2.4: Create Configuration System

Implement `src/utils/config.ts`:

- Load environment variables
- Provide typed configuration object
- Set sensible defaults

Create `.env` file:

```env
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3
CHUNK_SIZE=600
CHUNK_OVERLAP=90
TOP_K=5
SIMILARITY_THRESHOLD=0.7
```

### Step 2.5: Implement Logger

Create `src/utils/logger.ts`:

- Simple console logger
- Timestamp formatting
- Log levels: info, warn, error, debug

---

## Phase 3: LLM Integration

### Step 3.1: Implement Ollama Client

Create `src/llm/ollamaClient.ts`:

**Key methods**:

1. `generateEmbedding(text)`: POST to `/api/embeddings`
2. `generateChatCompletion(prompt)`: POST to `/api/generate`
3. `healthCheck()`: GET `/api/tags` to verify models

**Implementation details**:

- Use axios for HTTP requests
- 2-minute timeout for LLM responses
- Proper error handling
- Type-safe responses

**Testing**:

```bash
# Test embedding generation
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Hello world"
}'

# Test chat completion
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

---

## Phase 4: Vector Database Integration

### Step 4.1: Implement Qdrant Client

Create `src/vector/qdrantClient.ts`:

**Key methods**:

1. `initializeCollection(vectorSize)`: Create collection with cosine similarity
2. `storeChunks(chunks)`: Batch upsert vectors
3. `searchSimilar(queryVector, limit)`: Top-K similarity search
4. `healthCheck()`: Verify connection

**Collection schema**:

```typescript
{
  vectors: {
    size: 768,           // nomic-embed-text dimension
    distance: 'Cosine'   // similarity metric
  }
}
```

**Point structure**:

```typescript
{
  id: string,            // UUID
  vector: number[],      // 768-dim embedding
  payload: {
    text: string,        // chunk content
    source: string,      // filename
    chunkIndex: number   // position in document
  }
}
```

**Testing**:

```bash
# Check Qdrant health
curl http://localhost:6333/collections

# Create test collection
curl -X PUT http://localhost:6333/collections/test -H 'Content-Type: application/json' -d '{
  "vectors": {
    "size": 768,
    "distance": "Cosine"
  }
}'
```

---

## Phase 5: Document Processing

### Step 5.1: Implement Document Processor

Create `src/ingest/documentProcessor.ts`:

**Text extraction**:

- `.txt` and `.md`: Read directly with `fs.readFile`
- `.pdf`: Use `pdf-parse` library

**Chunking algorithm**:

```typescript
1. Calculate chunk size in characters (tokens * 4)
2. Calculate overlap in characters
3. Iterate through text:
   a. Extract chunk of target size
   b. Find sentence boundary near end
   c. Break at sentence if possible
   d. Move forward by (chunk_size - overlap)
4. Return array of chunks with indices
```

**Why 4 chars per token?**

- Rough approximation for English text
- Works well in practice
- Can be refined with tokenizer

**Testing**:

```typescript
const text = "This is a test. " * 1000;
const chunks = documentProcessor.chunkText(text, "test.txt");
console.log(`Created ${chunks.length} chunks`);
console.log(`First chunk: ${chunks[0].text.substring(0, 100)}...`);
```

---

## Phase 6: Ingestion Pipeline

### Step 6.1: Implement Ingestion Service

Create `src/ingest/ingestionService.ts`:

**Pipeline**:

```typescript
async ingestDocument(filePath, filename) {
  1. Extract text from file
  2. Validate text is not empty
  3. Chunk text with overlap
  4. For each chunk:
     a. Generate embedding
     b. Create document chunk object
  5. Store all chunks in Qdrant
  6. Return success + chunk count
}
```

**Error handling**:

- Empty documents
- Unsupported file types
- Embedding failures
- Storage failures

**Testing**:

```typescript
// Create test file
fs.writeFileSync("test.txt", "This is a test document. " * 100);

// Ingest
const result = await ingestionService.ingestDocument("test.txt", "test.txt");
console.log(result); // { success: true, chunks: X }
```

---

## Phase 7: Retrieval Pipeline

### Step 7.1: Implement Retrieval Service

Create `src/retrieval/retrievalService.ts`:

**Pipeline**:

```typescript
async retrieveRelevantChunks(query) {
  1. Generate embedding for query
  2. Search Qdrant for top-K similar chunks
  3. Filter by similarity threshold
  4. Return results with scores
}
```

**Context formatting**:

```typescript
formatContext(results) {
  return results.map((r, i) =>
    `[Document ${i+1}] (Source: ${r.source}, Chunk: ${r.chunkIndex})\n${r.text}`
  ).join('\n\n---\n\n');
}
```

**Source extraction**:

```typescript
extractSources(results) {
  return [...new Set(results.map(r =>
    `${r.source} (chunk ${r.chunkIndex})`
  ))];
}
```

**Testing**:

```typescript
const results = await retrievalService.retrieveRelevantChunks("test query");
console.log(`Found ${results.length} relevant chunks`);
console.log(results[0]); // { text, source, chunkIndex, score }
```

---

## Phase 8: Chat Pipeline

### Step 8.1: Design System Prompt

Create strict prompt that:

- Forbids hallucination
- Requires grounding in context
- Returns "I don't know" if uncertain
- Emphasizes accuracy over helpfulness

**Prompt template**:

```
You are a helpful assistant that answers questions based ONLY on the provided context documents.

CRITICAL RULES:
1. Answer ONLY using information from the context documents
2. If the answer is not in the context, respond with: "I don't know"
3. Do NOT use your general knowledge
4. Do NOT make assumptions
5. Do NOT hallucinate
6. Keep answers concise and factual

CONTEXT DOCUMENTS:
{context}

QUESTION: {question}

ANSWER:
```

### Step 8.2: Implement Chat Service

Create `src/chat/chatService.ts`:

**Pipeline**:

```typescript
async processChat(request) {
  1. Retrieve relevant chunks for question
  2. Format context from chunks
  3. Extract sources
  4. Build prompt (system + context + question)
  5. Generate answer with LLM
  6. Return answer + sources
}
```

**Edge cases**:

- No relevant chunks → Return "I don't know" immediately
- Empty question → Validation error
- LLM timeout → Error handling

**Testing**:

```typescript
const response = await chatService.processChat({
  question: "What is the main topic?",
});
console.log(response.answer);
console.log(response.sources);
```

---

## Phase 9: API Server

### Step 9.1: Implement Express Server

Create `src/server.ts`:

**Endpoints**:

1. **GET /api/health**
   - Check Ollama and Qdrant connectivity
   - Return service status

2. **POST /api/ingest**
   - Accept file upload (multipart/form-data)
   - Validate file type
   - Process document
   - Return success + chunk count

3. **POST /api/chat**
   - Accept JSON: `{ question: string }`
   - Process with RAG pipeline
   - Return: `{ answer: string, sources: string[] }`

**Middleware**:

- CORS for cross-origin requests
- JSON body parser
- Multer for file uploads
- Error handling

**Startup sequence**:

```typescript
1. Check Ollama connection
2. Check Qdrant connection
3. Initialize Qdrant collection
4. Create upload directory
5. Start Express server
```

### Step 9.2: Configure Multer

```typescript
const upload = multer({
  storage: diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.random()}`;
      cb(null, `${unique}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const valid = [".txt", ".md", ".pdf"].includes(
      path.extname(file.originalname),
    );
    cb(null, valid);
  },
});
```

---

## Phase 10: Testing & Validation

### Step 10.1: Manual Testing

**Test ingestion**:

```bash
# Create test document
echo "The capital of France is Paris. Paris is known for the Eiffel Tower." > test.txt

# Upload
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test.txt"

# Expected: { success: true, filename: "test.txt", chunks: 1 }
```

**Test chat**:

```bash
# Ask question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of France?"}'

# Expected: { answer: "Paris", sources: ["test.txt (chunk 0)"] }
```

**Test "I don't know"**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of Germany?"}'

# Expected: { answer: "I don't know...", sources: [] }
```

### Step 10.2: Edge Case Testing

1. **Empty file**: Should return error
2. **Large file**: Should process successfully
3. **Invalid file type**: Should reject
4. **No documents ingested**: Should return "I don't know"
5. **Malformed JSON**: Should return 400 error

### Step 10.3: Performance Testing

```bash
# Measure ingestion time
time curl -X POST http://localhost:3000/api/ingest -F "file=@large.pdf"

# Measure chat latency
time curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

---

## Phase 11: Documentation

### Step 11.1: Create README.md

- Project overview
- Quick start guide
- API documentation
- Configuration options
- Troubleshooting

### Step 11.2: Create ARCHITECTURE.md

- System design
- Component descriptions
- Data flow diagrams
- Design decisions

### Step 11.3: Create IMPLEMENTATION_PLAN.md

- Step-by-step guide (this document)
- Testing procedures
- Deployment instructions

---

## Phase 12: Deployment

### Step 12.1: Production Configuration

Create `.env.production`:

```env
NODE_ENV=production
PORT=3000
OLLAMA_BASE_URL=http://ollama:11434
QDRANT_URL=http://qdrant:6333
```

### Step 12.2: Docker Compose for Production

Add backend service to `docker-compose.yml`:

```yaml
backend:
  build: ./backend
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
  depends_on:
    - ollama
    - qdrant
```

### Step 12.3: Build and Deploy

```bash
# Build TypeScript
cd backend
npm run build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## Phase 13: Enhancements (Optional)

### Enhancement 1: Streaming Responses

Modify chat endpoint to support Server-Sent Events:

```typescript
app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  // Stream LLM response token by token
});
```

### Enhancement 2: Conversation Memory

Add Redis for storing conversation history:

```typescript
interface Conversation {
  id: string;
  messages: Array<{ role: string; content: string }>;
}
```

### Enhancement 3: Web UI

Create simple React frontend:

- File upload component
- Chat interface
- Source display

### Enhancement 4: Advanced Chunking

Implement semantic chunking:

- Use sentence embeddings
- Group similar sentences
- Maintain semantic coherence

---

## Troubleshooting Guide

### Issue: Ollama connection failed

**Symptoms**: Health check fails, embedding errors

**Solutions**:

1. Check Ollama is running: `docker ps | grep ollama`
2. Check logs: `docker logs ollama`
3. Verify models: `docker exec -it ollama ollama list`
4. Pull models if missing

### Issue: Qdrant connection failed

**Symptoms**: Collection initialization fails

**Solutions**:

1. Check Qdrant is running: `docker ps | grep qdrant`
2. Check logs: `docker logs qdrant`
3. Verify port 6333 is accessible: `curl http://localhost:6333/collections`

### Issue: Out of memory

**Symptoms**: Ollama crashes, slow responses

**Solutions**:

1. Use smaller model: `llama3:8b` instead of `llama3:70b`
2. Increase Docker memory limit
3. Reduce `TOP_K` and `CHUNK_SIZE`

### Issue: Slow ingestion

**Symptoms**: File upload takes too long

**Solutions**:

1. Enable GPU for Ollama
2. Reduce chunk size
3. Implement batch embedding
4. Use async processing with queue

### Issue: Poor answer quality

**Symptoms**: Irrelevant answers, hallucinations

**Solutions**:

1. Increase `SIMILARITY_THRESHOLD`
2. Adjust `CHUNK_SIZE` and `CHUNK_OVERLAP`
3. Improve system prompt
4. Use better embedding model
5. Implement reranking

---

## Success Criteria

✅ All services start successfully
✅ Health check returns "healthy"
✅ Documents can be ingested
✅ Questions return relevant answers
✅ Sources are correctly attributed
✅ "I don't know" works for unanswerable questions
✅ API responds within reasonable time (<30s for chat)
✅ No crashes or memory leaks

---

## Next Steps

After completing this implementation:

1. **Add tests**: Unit and integration tests
2. **Improve UI**: Build React frontend
3. **Add auth**: Implement user authentication
4. **Scale**: Add load balancing and caching
5. **Monitor**: Set up logging and metrics
6. **Optimize**: Profile and improve performance
7. **Document**: Add API documentation (Swagger)
8. **Deploy**: Set up CI/CD pipeline

---

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Llama3 Model Card](https://huggingface.co/meta-llama/Meta-Llama-3-8B)
- [Nomic Embed Text](https://huggingface.co/nomic-ai/nomic-embed-text-v1)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

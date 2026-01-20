# Open-Source RAG Chatbot

A fully open-source, self-hostable Retrieval-Augmented Generation (RAG) chatbot built with Node.js, TypeScript, Ollama, and Qdrant.

## Architecture Overview

This RAG system consists of three main pipelines:

### 1. Ingestion Pipeline

- Accepts documents (.txt, .md, .pdf)
- Extracts and chunks text (500-700 tokens with 10-15% overlap)
- Generates embeddings using `nomic-embed-text` via Ollama
- Stores vectors in Qdrant with metadata

### 2. Retrieval Pipeline

- Converts user query to embedding
- Performs similarity search in Qdrant (top-K=5)
- Filters by similarity threshold
- Returns relevant chunks with sources

### 3. Generation Pipeline

- Constructs prompt with retrieved context
- Sends to Llama3 via Ollama
- Enforces strict retrieval-only answering
- Returns answer with source attribution

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **LLM**: Ollama (llama3 for chat, nomic-embed-text for embeddings)
- **Vector DB**: Qdrant (Docker)
- **Document Processing**: pdf-parse for PDFs
- **License**: MIT

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- 8GB+ RAM (for running Llama3)

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:

- Qdrant on port 6333
- Ollama on port 11434

### 2. Pull Ollama Models

```bash
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull nomic-embed-text
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Run the Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### POST /api/ingest

Upload and process documents.

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@document.pdf"
```

**Response:**

```json
{
  "success": true,
  "filename": "document.pdf",
  "chunks": 42
}
```

### POST /api/chat

Ask questions based on ingested documents.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic?"}'
```

**Response:**

```json
{
  "answer": "Based on the documents, the main topic is...",
  "sources": ["document.pdf (chunk 1)", "document.pdf (chunk 5)"]
}
```

### GET /api/health

Check system health.

```bash
curl http://localhost:3000/api/health
```

## Project Structure

```
backend/
├── src/
│   ├── ingest/
│   │   ├── documentProcessor.ts    # Document parsing & chunking
│   │   └── ingestionService.ts     # Orchestrates ingestion
│   ├── retrieval/
│   │   └── retrievalService.ts     # Similarity search
│   ├── vector/
│   │   └── qdrantClient.ts         # Qdrant operations
│   ├── llm/
│   │   └── ollamaClient.ts         # Ollama API client
│   ├── chat/
│   │   └── chatService.ts          # RAG orchestration
│   ├── utils/
│   │   ├── logger.ts               # Logging utility
│   │   └── config.ts               # Configuration
│   └── server.ts                   # Express server
├── uploads/                        # Temporary file storage
├── package.json
├── tsconfig.json
└── .env.example
```

## Configuration

Create a `.env` file:

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

## How It Works

### Document Ingestion

1. User uploads a document via `/api/ingest`
2. System extracts text (handles .txt, .md, .pdf)
3. Text is split into overlapping chunks (~600 tokens)
4. Each chunk is embedded using `nomic-embed-text`
5. Embeddings stored in Qdrant with metadata

### Question Answering

1. User asks a question via `/api/chat`
2. Question is embedded using same model
3. Top-5 similar chunks retrieved from Qdrant
4. Chunks filtered by similarity threshold (0.7)
5. Context + question sent to Llama3 with strict prompt
6. LLM generates answer based only on context
7. Response includes answer + source attribution

## Prompt Engineering

The system uses a strict prompt that:

- Forbids hallucination
- Requires answers to be grounded in context
- Returns "I don't know" if answer not found
- Maintains factual accuracy

## Security Considerations

- File upload size limits (10MB default)
- File type validation
- Input sanitization
- No arbitrary code execution
- Rate limiting recommended for production
- CORS configuration for frontend integration

## Production Deployment

### Scaling Considerations

- Use persistent volumes for Qdrant data
- Configure Ollama GPU support for faster inference
- Add Redis for caching embeddings
- Implement queue system for async ingestion
- Add authentication/authorization
- Set up monitoring (Prometheus + Grafana)

### Docker Production Build

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Limitations

- No conversation memory (stateless)
- Single collection in Qdrant
- Synchronous processing
- No multi-user support
- Basic error handling

## Future Enhancements

- [ ] Streaming responses
- [ ] Conversation history
- [ ] Multi-document collections
- [ ] Advanced chunking strategies
- [ ] Reranking with cross-encoders
- [ ] Web UI
- [ ] Authentication
- [ ] Multi-language support

## License

MIT License - See LICENSE file

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests
4. Submit a pull request

## Troubleshooting

### Ollama connection failed

```bash
docker logs ollama
# Ensure models are pulled
docker exec -it ollama ollama list
```

### Qdrant connection failed

```bash
docker logs qdrant
# Check if port 6333 is available
```

### Out of memory

- Reduce `CHUNK_SIZE` and `TOP_K`
- Use smaller model (llama3:8b instead of llama3:70b)
- Increase Docker memory limit

## Cleanup

To remove all created resources and start fresh:

```bash
# Standard cleanup (keeps Docker images)
./cleanup.sh

# Complete cleanup (removes everything including images)
./cleanup-complete.sh
```

See `CLEANUP_GUIDE.md` for detailed information.

## Support

For issues and questions, please open a GitHub issue.

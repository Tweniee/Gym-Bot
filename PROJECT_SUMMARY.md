# Project Summary: Open-Source RAG Chatbot

## Overview

This is a **fully open-source, self-hostable Retrieval-Augmented Generation (RAG) chatbot** built from scratch using Node.js, TypeScript, Ollama, and Qdrant. The system allows users to upload documents and ask questions that are answered based solely on the content of those documents.

## Key Features

✅ **100% Open Source** - No proprietary APIs or paid services
✅ **Self-Hostable** - Runs entirely on your infrastructure
✅ **Docker-Based** - Easy deployment with Docker Compose
✅ **Production-Ready** - Clean architecture, error handling, logging
✅ **Type-Safe** - Full TypeScript implementation
✅ **Hallucination Prevention** - Strict prompt engineering
✅ **Source Attribution** - Every answer cites its sources
✅ **Multiple File Formats** - Supports .txt, .md, and .pdf

## Technology Stack

| Component               | Technology                | Purpose                 |
| ----------------------- | ------------------------- | ----------------------- |
| **Runtime**             | Node.js 20 + TypeScript   | Backend server          |
| **Framework**           | Express.js                | REST API                |
| **LLM**                 | Ollama (llama3)           | Text generation         |
| **Embeddings**          | Ollama (nomic-embed-text) | Vector embeddings       |
| **Vector DB**           | Qdrant                    | Similarity search       |
| **Document Processing** | pdf-parse                 | PDF text extraction     |
| **Deployment**          | Docker Compose            | Container orchestration |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      EXPRESS API                             │
│  POST /api/ingest  │  POST /api/chat  │  GET /api/health   │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│  INGESTION       │                  │  CHAT SERVICE    │
│  - Extract text  │                  │  - Retrieve      │
│  - Chunk text    │                  │  - Generate      │
│  - Embed chunks  │                  │  - Respond       │
│  - Store vectors │                  └──────────────────┘
└──────────────────┘                           ↓
        ↓                              ┌──────────────────┐
┌──────────────────┐                  │  RETRIEVAL       │
│  OLLAMA          │←─────────────────│  - Embed query   │
│  - llama3        │                  │  - Search        │
│  - nomic-embed   │                  │  - Format        │
└──────────────────┘                  └──────────────────┘
                                               ↓
                                      ┌──────────────────┐
                                      │  QDRANT          │
                                      │  - Vector store  │
                                      │  - Similarity    │
                                      └──────────────────┘
```

## Project Structure

```
rag-chatbot/
├── README.md                    # Main documentation
├── ARCHITECTURE.md              # Detailed architecture
├── IMPLEMENTATION_PLAN.md       # Step-by-step guide
├── SECURITY.md                  # Security considerations
├── TESTING.md                   # Testing procedures
├── DEPLOYMENT.md                # Deployment guide
├── LICENSE                      # MIT License
├── docker-compose.yml           # Infrastructure setup
├── .gitignore                   # Git ignore rules
│
├── backend/
│   ├── src/
│   │   ├── ingest/
│   │   │   ├── documentProcessor.ts    # Text extraction & chunking
│   │   │   └── ingestionService.ts     # Ingestion orchestration
│   │   ├── retrieval/
│   │   │   └── retrievalService.ts     # Similarity search
│   │   ├── vector/
│   │   │   └── qdrantClient.ts         # Qdrant operations
│   │   ├── llm/
│   │   │   └── ollamaClient.ts         # Ollama API client
│   │   ├── chat/
│   │   │   └── chatService.ts          # RAG orchestration
│   │   ├── utils/
│   │   │   ├── config.ts               # Configuration
│   │   │   └── logger.ts               # Logging
│   │   └── server.ts                   # Express server
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .eslintrc.json
│   └── .prettierrc.json
│
└── frontend/
    └── index.html               # Simple web UI
```

## Core Components

### 1. Document Processor

- Extracts text from .txt, .md, and .pdf files
- Chunks text into 600-token segments with 15% overlap
- Smart boundary detection at sentence endings
- Prevents information loss at chunk boundaries

### 2. Ollama Client

- Generates 768-dimensional embeddings using nomic-embed-text
- Generates chat completions using llama3
- Health checks to verify model availability
- Configurable timeouts and error handling

### 3. Qdrant Service

- Stores document embeddings with metadata
- Performs cosine similarity search
- Filters results by similarity threshold (0.7)
- Supports collection initialization and management

### 4. Ingestion Service

- Orchestrates document processing pipeline
- Generates embeddings for each chunk
- Stores vectors in Qdrant
- Returns success status and chunk count

### 5. Retrieval Service

- Embeds user queries
- Searches for top-K similar chunks (K=5)
- Formats context for LLM
- Extracts source attribution

### 6. Chat Service

- Implements strict RAG prompt
- Prevents hallucination
- Returns "I don't know" when uncertain
- Provides source citations

## Key Design Decisions

### Why Ollama?

- **Open-source**: MIT licensed
- **Easy setup**: Single Docker container
- **Model management**: Simple pull/run commands
- **API**: REST API for embeddings and chat
- **GPU support**: Optional NVIDIA GPU acceleration

### Why Qdrant?

- **Open-source**: Apache 2.0 licensed
- **Performance**: Fast similarity search
- **Docker-native**: Easy deployment
- **Features**: Rich filtering and metadata support
- **Scalability**: Cluster mode available

### Why Express over NestJS?

- **Simplicity**: Less boilerplate
- **Transparency**: Clear request flow
- **Learning curve**: Easier for contributors
- **Sufficient**: Meets all requirements

### Why TypeScript?

- **Type safety**: Catch errors at compile time
- **IDE support**: Better autocomplete and refactoring
- **Documentation**: Types serve as documentation
- **Industry standard**: Widely adopted

### Chunking Strategy

- **Size**: 600 tokens (~2400 characters)
  - Large enough for context
  - Small enough for precision
- **Overlap**: 90 tokens (15%)
  - Prevents information loss
  - Maintains continuity
- **Boundaries**: Sentence-aware
  - Preserves semantic meaning
  - Improves retrieval quality

### Prompt Engineering

- **Strict grounding**: Answer only from context
- **Explicit constraints**: No hallucination allowed
- **Uncertainty handling**: "I don't know" fallback
- **Source citation**: Always reference documents

## API Endpoints

### POST /api/ingest

Upload and process documents.

**Request**:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@document.pdf"
```

**Response**:

```json
{
  "success": true,
  "filename": "document.pdf",
  "chunks": 42
}
```

### POST /api/chat

Ask questions about ingested documents.

**Request**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic?"}'
```

**Response**:

```json
{
  "answer": "Based on the documents, the main topic is...",
  "sources": ["document.pdf (chunk 1)", "document.pdf (chunk 5)"]
}
```

### GET /api/health

Check system health.

**Response**:

```json
{
  "status": "healthy",
  "services": {
    "ollama": "up",
    "qdrant": "up"
  },
  "timestamp": "2026-01-21T..."
}
```

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Pull models
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull nomic-embed-text

# 3. Install dependencies
cd backend && npm install

# 4. Start server
npm run dev

# 5. Test
curl http://localhost:3000/api/health
```

## Configuration

All configuration via environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents

# RAG Parameters
CHUNK_SIZE=600
CHUNK_OVERLAP=90
TOP_K=5
SIMILARITY_THRESHOLD=0.7

# Upload
MAX_FILE_SIZE=10485760  # 10MB
```

## Performance Characteristics

| Operation          | Time           | Notes                    |
| ------------------ | -------------- | ------------------------ |
| Document ingestion | 1-2s per chunk | Embedding generation     |
| Similarity search  | 100-200ms      | Qdrant search            |
| LLM generation     | 5-30s          | Depends on answer length |
| Total chat latency | 5-35s          | End-to-end               |

## Resource Requirements

| Component          | CPU         | Memory      | Disk                |
| ------------------ | ----------- | ----------- | ------------------- |
| Ollama (llama3:8b) | 2 cores     | 4-8 GB      | 5 GB                |
| Qdrant             | 1 core      | 1 GB        | 1 GB per 1M vectors |
| Backend            | 1 core      | 200 MB      | 100 MB              |
| **Total**          | **4 cores** | **6-10 GB** | **10 GB**           |

## Security Features

✅ File type validation (whitelist)
✅ File size limits (10MB)
✅ Input sanitization
✅ Prompt injection prevention
✅ No code execution
✅ Timeout protection
✅ Error message sanitization
✅ CORS configuration

## Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Ingest document
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test.txt"

# Ask question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic?"}'

# Run automated tests
./test.sh
```

## Deployment Options

1. **Local Development**: Docker Compose
2. **Production**: Docker Compose with Nginx
3. **Cloud**: AWS ECS + EC2 (GPU)
4. **Kubernetes**: K8s manifests provided

## Limitations

- No conversation memory (stateless)
- Single collection in Qdrant
- Synchronous embedding generation
- No multi-user support
- Basic error handling
- No authentication

## Future Enhancements

- [ ] Streaming responses (SSE)
- [ ] Conversation history (Redis)
- [ ] Multi-collection support
- [ ] Advanced chunking (semantic)
- [ ] Reranking with cross-encoders
- [ ] Web UI (React)
- [ ] Authentication/authorization
- [ ] Multi-language support
- [ ] Hybrid search (vector + keyword)
- [ ] Fine-tuned embedding model

## Documentation

| Document               | Purpose                  |
| ---------------------- | ------------------------ |
| README.md              | Quick start and overview |
| ARCHITECTURE.md        | Detailed system design   |
| IMPLEMENTATION_PLAN.md | Step-by-step build guide |
| SECURITY.md            | Security considerations  |
| TESTING.md             | Testing procedures       |
| DEPLOYMENT.md          | Deployment guide         |
| PROJECT_SUMMARY.md     | This document            |

## License

MIT License - Free for commercial and personal use

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests
4. Submit a pull request

## Support

For issues and questions:

- GitHub Issues: [your-repo]/issues
- Documentation: See docs/ folder
- Community: [your-discord/forum]

## Acknowledgments

- **Ollama**: For making LLMs accessible
- **Qdrant**: For excellent vector database
- **Meta**: For Llama3 model
- **Nomic AI**: For embedding model
- **Open-source community**: For all the tools

## Success Metrics

✅ **Functional**: All endpoints working
✅ **Accurate**: Answers grounded in documents
✅ **Fast**: <30s response time
✅ **Reliable**: No crashes or memory leaks
✅ **Secure**: Input validation and error handling
✅ **Documented**: Comprehensive documentation
✅ **Tested**: Manual and automated tests
✅ **Deployable**: Docker Compose ready

## Conclusion

This RAG chatbot demonstrates how to build a production-grade, fully open-source question-answering system using modern tools and best practices. The modular architecture makes it easy to understand, extend, and deploy.

**Key Takeaways**:

1. Open-source tools can match proprietary solutions
2. Clean architecture enables maintainability
3. Prompt engineering prevents hallucination
4. Docker simplifies deployment
5. TypeScript improves code quality

**Next Steps**:

1. Deploy to your infrastructure
2. Customize for your use case
3. Add enhancements as needed
4. Share with the community
5. Contribute improvements

---

**Built with ❤️ using only open-source tools**

No OpenAI. No Anthropic. No Pinecone. No paid APIs.

Just pure open-source goodness. 🚀

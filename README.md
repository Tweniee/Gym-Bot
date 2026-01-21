# RAG Chatbot - Document Q&A System

A **100% open source** RAG (Retrieval-Augmented Generation) system that lets you ask questions about your documents. No API keys, no cloud services, completely free.

## ✨ Features

- 🔓 **Completely Open Source** - All components are free and open source
- 🔒 **Privacy First** - Everything runs locally, your data never leaves your machine
- 💰 **Zero Cost** - No API fees, no subscriptions, no hidden costs
- 📄 **Multiple Formats** - PDF, CSV, TXT, MD files supported
- 🚀 **Easy Setup** - One command to start everything
- 🎯 **Accurate Answers** - Powered by Llama 3 and semantic search

## Quick Start

1. **Place your documents** in `backend/documents/` folder
   - Supported formats: PDF, CSV, TXT, MD

2. **Start the system**

   ```bash
   ./start.sh
   ```

3. **Ask questions via API**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H 'Content-Type: application/json' \
     -d '{"question": "What is in the documents?"}'
   ```

## How It Works

1. On startup, the system automatically ingests all documents from `backend/documents/`
2. Documents are chunked and embedded using Ollama's `nomic-embed-text` model
3. Embeddings are stored in Qdrant vector database
4. When you ask a question, relevant chunks are retrieved and sent to `llama3` for answering

## API Endpoints

### Health Check

```bash
GET http://localhost:3000/api/health
```

### List Processed Documents

```bash
GET http://localhost:3000/api/documents
```

### Ask Questions

```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "question": "Your question here"
}
```

## Requirements

- Docker & Docker Compose
- Node.js 20+
- ~10GB disk space (5GB for models, 5GB for Docker images)
- No API keys needed!
- No internet required after initial setup!

## Architecture

- **Backend**: Node.js + TypeScript + Express
- **Vector DB**: Qdrant (runs in Docker)
- **LLM**: Ollama with llama3 and nomic-embed-text (runs in Docker)

## Adding New Documents

1. Place files in `backend/documents/`
2. Restart the system with `./start.sh`
3. New documents will be automatically ingested

## Stopping the System

1. Press `Ctrl+C` to stop the backend
2. Run `docker-compose down` to stop Docker services

## Configuration

Edit `backend/.env` to customize:

- `CHUNK_SIZE`: Size of text chunks (default: 500 tokens)
- `CHUNK_OVERLAP`: Overlap between chunks (default: 50 tokens)
- `TOP_K`: Number of relevant chunks to retrieve (default: 5)
- `EMBEDDING_MODEL`: Ollama embedding model (default: nomic-embed-text)
- `CHAT_MODEL`: Ollama chat model (default: llama3)

## Troubleshooting

**Models not downloading?**

```bash
docker exec ollama ollama pull llama3
docker exec ollama ollama pull nomic-embed-text
```

**Qdrant not starting?**

```bash
docker-compose down
docker-compose up -d
```

**Check logs:**

```bash
docker-compose logs
```

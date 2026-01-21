# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Add Your Documents

```bash
# Place your files in the documents folder
cp your-file.pdf backend/documents/
cp your-data.csv backend/documents/
```

Supported formats: **PDF, CSV, TXT, MD**

### 2. Start the System

```bash
./start.sh
```

This will:

- Start Docker services (Qdrant + Ollama)
- Download AI models (~5GB first time)
- Ingest all your documents automatically
- Start the API server

### 3. Ask Questions

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "Your question here"}'
```

## 📝 Example

Try with the included gym members dataset:

```bash
# Start the system
./start.sh

# Wait for "Ready to answer questions!" message

# Ask about the gym data
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is the average age of gym members?"}'
```

## 🔧 API Endpoints

| Endpoint         | Method | Description              |
| ---------------- | ------ | ------------------------ |
| `/api/health`    | GET    | Check system status      |
| `/api/documents` | GET    | List processed documents |
| `/api/chat`      | POST   | Ask questions            |

## 📚 More Information

- **USAGE.md** - Detailed usage examples
- **README.md** - Full documentation
- **test-api.sh** - Test script (run `chmod +x test-api.sh && ./test-api.sh`)

## 🛑 Stop the System

1. Press `Ctrl+C` to stop the backend
2. Run `docker-compose down` to stop Docker services

## ⚠️ Requirements

- Docker & Docker Compose
- Node.js 20+
- ~5GB disk space for AI models

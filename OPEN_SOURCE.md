# Open Source Components

This project uses **100% open source** components. No proprietary software or paid services required.

## Docker Images

### 1. Qdrant Vector Database

- **Image:** `qdrant/qdrant:latest`
- **License:** Apache License 2.0
- **Source:** https://github.com/qdrant/qdrant
- **Purpose:** Vector database for storing document embeddings
- **Why it's great:**
  - Fast and efficient vector search
  - Easy to use REST API
  - No vendor lock-in
  - Active community

### 2. Ollama

- **Image:** `ollama/ollama:latest`
- **License:** MIT License
- **Source:** https://github.com/ollama/ollama
- **Purpose:** Run LLMs locally
- **Why it's great:**
  - Run models completely offline
  - No API keys needed
  - Privacy-focused (data never leaves your machine)
  - Supports many open source models

## AI Models (via Ollama)

### 1. Llama 3

- **Model:** `llama3` (8B parameters)
- **License:** Llama 3 Community License (free for research and commercial use)
- **Source:** Meta AI
- **Purpose:** Chat/question answering
- **Size:** ~4.7GB
- **Why it's great:**
  - State-of-the-art performance
  - Fast inference
  - Good reasoning capabilities

### 2. Nomic Embed Text

- **Model:** `nomic-embed-text`
- **License:** Apache License 2.0
- **Source:** Nomic AI
- **Purpose:** Text embeddings for semantic search
- **Size:** ~274MB
- **Dimensions:** 768
- **Why it's great:**
  - High quality embeddings
  - Fast processing
  - Optimized for RAG applications

## Backend Dependencies

All Node.js packages are open source:

### Core Framework

- **Express.js** - MIT License
- **TypeScript** - Apache License 2.0

### Vector Database Client

- **@qdrant/js-client-rest** - Apache License 2.0

### Document Processing

- **pdf-parse** - MIT License
- **multer** - MIT License (not used in simplified version)

### Utilities

- **axios** - MIT License
- **dotenv** - BSD-2-Clause License
- **cors** - MIT License
- **uuid** - MIT License

## License Compliance

✅ **All components are free to use for:**

- Personal projects
- Commercial applications
- Research and development
- Educational purposes

✅ **No restrictions on:**

- Number of users
- API calls
- Data volume
- Deployment locations

✅ **Complete data privacy:**

- Everything runs locally
- No data sent to external services
- No API keys required
- No telemetry or tracking

## Cost Breakdown

| Component        | Cost   | Notes                    |
| ---------------- | ------ | ------------------------ |
| Qdrant           | $0     | Open source, self-hosted |
| Ollama           | $0     | Open source, self-hosted |
| Llama 3          | $0     | Free for commercial use  |
| Nomic Embed      | $0     | Apache 2.0 license       |
| Node.js packages | $0     | All open source          |
| **Total**        | **$0** | **100% free**            |

## Hardware Requirements

**Minimum:**

- 8GB RAM
- 10GB disk space
- CPU: Any modern processor

**Recommended:**

- 16GB RAM
- 20GB disk space
- GPU: Optional (speeds up inference)

## Comparison with Proprietary Solutions

| Feature        | This Project | OpenAI API       | Pinecone           |
| -------------- | ------------ | ---------------- | ------------------ |
| Cost           | $0           | ~$0.50/1K tokens | ~$70/month         |
| Privacy        | 100% local   | Data sent to API | Data sent to cloud |
| Internet       | Not required | Required         | Required           |
| Customization  | Full control | Limited          | Limited            |
| Vendor lock-in | None         | High             | High               |

## Contributing

All components welcome contributions:

- **Qdrant:** https://github.com/qdrant/qdrant
- **Ollama:** https://github.com/ollama/ollama
- **This project:** Fork and submit PRs!

## Alternative Models

You can easily swap models by editing `backend/.env`:

### Chat Models (alternatives to llama3)

```bash
CHAT_MODEL=mistral        # Mistral 7B
CHAT_MODEL=phi3           # Microsoft Phi-3
CHAT_MODEL=gemma2         # Google Gemma 2
CHAT_MODEL=llama3.1       # Llama 3.1 (larger)
```

### Embedding Models (alternatives to nomic-embed-text)

```bash
EMBEDDING_MODEL=mxbai-embed-large    # MixedBread AI
EMBEDDING_MODEL=all-minilm           # Sentence Transformers
```

All models available at: https://ollama.com/library

## Support Open Source

If you find this project useful, consider:

- ⭐ Star the repositories
- 🐛 Report bugs and issues
- 💡 Suggest improvements
- 🤝 Contribute code
- 📢 Share with others

## License

This project is released under the **MIT License** - see LICENSE file for details.

You are free to:

- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Use privately

The only requirement is to include the original license notice.

# Frequently Asked Questions (FAQ)

## General Questions

### What is RAG?

**RAG (Retrieval-Augmented Generation)** is a technique that combines:

1. **Retrieval**: Finding relevant information from a knowledge base
2. **Generation**: Using an LLM to generate answers based on retrieved information

This prevents hallucination by grounding the LLM's responses in actual documents.

### Why build this instead of using ChatGPT?

- **Privacy**: Your documents stay on your infrastructure
- **Cost**: No per-token API fees
- **Control**: Full control over models and data
- **Customization**: Modify any part of the system
- **No vendor lock-in**: 100% open-source

### Is this production-ready?

Yes! The code includes:

- Error handling
- Logging
- Type safety
- Security measures
- Documentation
- Testing procedures

However, you should add authentication, monitoring, and backups for production use.

---

## Technical Questions

### What models does this use?

- **Chat**: Llama3 (8B or 70B parameters)
- **Embeddings**: nomic-embed-text (768 dimensions)

Both are open-source and run locally via Ollama.

### Can I use different models?

Yes! Edit `.env`:

```env
CHAT_MODEL=mistral
EMBEDDING_MODEL=all-minilm
```

Any model supported by Ollama will work.

### How much RAM do I need?

Minimum requirements:

- **Llama3:8b**: 4-8 GB RAM
- **Qdrant**: 1 GB RAM
- **Backend**: 200 MB RAM
- **Total**: ~6-10 GB RAM

For llama3:70b, you need 40+ GB RAM.

### Can I use a GPU?

Yes! Uncomment the GPU section in `docker-compose.yml`:

```yaml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

This significantly speeds up inference.

### What file formats are supported?

Currently:

- `.txt` - Plain text
- `.md` - Markdown
- `.pdf` - PDF documents

You can add more by extending `documentProcessor.ts`.

### How large can documents be?

Default limit: **10MB per file**

Adjust in `.env`:

```env
MAX_FILE_SIZE=20971520  # 20MB
```

### How many documents can I upload?

No hard limit. Qdrant can handle millions of vectors. Practical limits depend on:

- Available disk space
- RAM for vector search
- Ingestion time

---

## Performance Questions

### Why are responses slow?

LLM generation is the bottleneck (~10-30 seconds). To speed up:

1. **Use GPU**: 5-10x faster
2. **Smaller model**: llama3:8b-q4 is faster
3. **Reduce context**: Lower `TOP_K` value
4. **Quantized models**: Use q4 or q5 quantization

### How can I make ingestion faster?

1. **Use GPU**: Faster embedding generation
2. **Batch processing**: Process multiple chunks at once
3. **Smaller chunks**: Reduce `CHUNK_SIZE`
4. **Parallel processing**: Use worker threads

### What's the maximum throughput?

Depends on hardware:

- **CPU only**: ~1-2 requests/minute
- **GPU (T4)**: ~10-20 requests/minute
- **GPU (A100)**: ~50-100 requests/minute

Scale horizontally for higher throughput.

---

## Configuration Questions

### What do the RAG parameters mean?

**CHUNK_SIZE** (default: 600 tokens)

- Larger = more context, less precision
- Smaller = more precision, less context

**CHUNK_OVERLAP** (default: 90 tokens, 15%)

- Prevents information loss at boundaries
- Higher = more redundancy, better recall

**TOP_K** (default: 5)

- Number of chunks to retrieve
- Higher = more context, slower, more noise

**SIMILARITY_THRESHOLD** (default: 0.7)

- Minimum similarity score (0-1)
- Higher = more precision, less recall

### How do I tune for my use case?

**Technical docs** (high precision needed):

```env
CHUNK_SIZE=400
CHUNK_OVERLAP=120
TOP_K=3
SIMILARITY_THRESHOLD=0.8
```

**General knowledge** (broad context needed):

```env
CHUNK_SIZE=800
CHUNK_OVERLAP=80
TOP_K=10
SIMILARITY_THRESHOLD=0.6
```

**Legal documents** (exact matches needed):

```env
CHUNK_SIZE=500
CHUNK_OVERLAP=100
TOP_K=5
SIMILARITY_THRESHOLD=0.85
```

---

## Deployment Questions

### Can I deploy this to the cloud?

Yes! See `DEPLOYMENT.md` for:

- AWS deployment
- Google Cloud deployment
- Azure deployment
- Kubernetes deployment

### Do I need a GPU in production?

Not required, but highly recommended for:

- Faster responses
- Higher throughput
- Better user experience

CPU-only works fine for low-traffic applications.

### How do I scale this?

**Horizontal scaling**:

- Multiple backend instances behind load balancer
- Qdrant cluster mode
- Multiple Ollama instances

**Vertical scaling**:

- Larger GPU for Ollama
- More RAM for Qdrant
- More CPU cores for backend

### What about HTTPS?

Use a reverse proxy (Nginx, Caddy, Traefik):

```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Security Questions

### Is this secure?

Basic security is implemented:

- File type validation
- File size limits
- Input sanitization
- Timeout protection

For production, add:

- Authentication
- Rate limiting
- HTTPS
- Firewall rules

### Can users access each other's documents?

Currently, no. There's no multi-user support. All documents are in a single collection.

For multi-user, implement:

- User authentication
- Separate collections per user
- Access control

### How do I prevent prompt injection?

The system prompt explicitly forbids:

- Following instructions from context
- Revealing system prompt
- Executing code

Test with adversarial inputs to verify.

### Should I expose this to the internet?

Only with proper security:

- [ ] HTTPS enabled
- [ ] Authentication required
- [ ] Rate limiting configured
- [ ] Firewall rules set
- [ ] Monitoring active
- [ ] Backups configured

---

## Troubleshooting Questions

### "Model not found" error

Pull the models:

```bash
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull nomic-embed-text
```

### "Connection refused" error

Check services are running:

```bash
docker ps
docker-compose logs
```

Restart if needed:

```bash
docker-compose restart
```

### Out of memory errors

Solutions:

1. Use smaller model: `llama3:8b-q4`
2. Reduce chunk size and top-K
3. Increase Docker memory limit
4. Add swap space

### Slow or hanging responses

Check:

1. Ollama logs: `docker logs ollama`
2. Backend logs: `npm run dev`
3. Resource usage: `docker stats`

Possible causes:

- Model loading (first request is slow)
- CPU throttling
- Network issues

### "I don't know" for everything

Possible causes:

1. No documents ingested
2. Similarity threshold too high
3. Embedding model mismatch
4. Qdrant collection empty

Debug:

```bash
# Check collection
curl http://localhost:6333/collections/documents

# Check point count
curl http://localhost:6333/collections/documents/points/count
```

### Answers are not accurate

Try:

1. Increase `TOP_K` for more context
2. Decrease `SIMILARITY_THRESHOLD`
3. Adjust `CHUNK_SIZE` and `CHUNK_OVERLAP`
4. Improve document quality
5. Refine system prompt

---

## Development Questions

### How do I add a new file type?

Edit `backend/src/ingest/documentProcessor.ts`:

```typescript
async extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
    case '.md':
      return await this.extractTextFile(filePath);
    case '.pdf':
      return await this.extractPdfFile(filePath);
    case '.docx':  // Add new type
      return await this.extractDocxFile(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
```

### How do I add conversation memory?

Use Redis to store conversation history:

```typescript
interface Conversation {
  id: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// Store in Redis
await redis.set(`conversation:${id}`, JSON.stringify(conversation));

// Retrieve and include in prompt
const history = await redis.get(`conversation:${id}`);
```

### How do I add streaming responses?

Use Server-Sent Events (SSE):

```typescript
app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Stream tokens as they're generated
  for await (const token of generateStream(prompt)) {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.end();
});
```

### How do I add authentication?

Use JWT tokens:

```typescript
import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.use("/api/", authMiddleware);
```

---

## Cost Questions

### How much does this cost to run?

**Self-hosted** (one-time):

- Server/VPS: $20-100/month
- Domain: $10/year
- SSL certificate: Free (Let's Encrypt)

**Cloud** (AWS example):

- EC2 g4dn.xlarge (GPU): ~$360/month
- ECS tasks: ~$50/month
- Load balancer: ~$20/month
- Data transfer: ~$10/month
- **Total**: ~$440/month

**vs. OpenAI API**:

- GPT-4: $0.03/1K tokens input, $0.06/1K tokens output
- Embeddings: $0.0001/1K tokens
- 1M tokens/month ≈ $50-100

Self-hosted is cheaper at scale.

### Can I reduce costs?

Yes:

1. Use spot instances (AWS)
2. Use smaller models
3. Implement caching
4. Auto-scale based on load
5. Use CPU-only for low traffic

---

## Comparison Questions

### How does this compare to OpenAI?

| Feature       | This System     | OpenAI              |
| ------------- | --------------- | ------------------- |
| Cost          | Fixed (hosting) | Per-token           |
| Privacy       | Full control    | Data sent to OpenAI |
| Customization | Full access     | Limited             |
| Models        | Open-source     | Proprietary         |
| Latency       | 10-30s          | 2-5s                |
| Quality       | Good            | Excellent           |

### How does this compare to LangChain?

This is a **complete implementation**, not a framework.

LangChain is a framework for building LLM apps. This project shows you how to build one from scratch without frameworks.

### How does this compare to Pinecone?

| Feature     | Qdrant (this)      | Pinecone     |
| ----------- | ------------------ | ------------ |
| Cost        | Free (self-hosted) | $70+/month   |
| Privacy     | Full control       | Cloud-hosted |
| Setup       | Docker             | API key      |
| Performance | Excellent          | Excellent    |
| Scalability | Manual             | Automatic    |

---

## Future Questions

### What features are planned?

See `OVERVIEW.md` roadmap:

- Streaming responses
- Conversation memory
- Web UI (React)
- Multi-language support
- Advanced chunking
- Reranking

### Can I contribute?

Yes! We welcome:

- Bug reports
- Feature requests
- Documentation improvements
- Code contributions
- Use case examples

See CONTRIBUTING.md for guidelines.

### Will this work with future models?

Yes! The architecture is model-agnostic. As new models are released on Ollama, you can use them by changing the `.env` file.

---

## Getting Help

### Where can I get support?

1. **Documentation**: Read the docs/ folder
2. **GitHub Issues**: Report bugs and ask questions
3. **Community**: Join Discord/Forum
4. **Email**: support@example.com

### How do I report a bug?

Open a GitHub issue with:

- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- System information
- Logs (if applicable)

### How do I request a feature?

Open a GitHub issue with:

- Feature description
- Use case
- Why it's important
- Proposed implementation (optional)

---

## Best Practices

### Document preparation

1. **Clean formatting**: Remove unnecessary whitespace
2. **Clear structure**: Use headings and sections
3. **Consistent style**: Maintain uniform formatting
4. **Relevant content**: Only include necessary information

### Question formulation

1. **Be specific**: Ask clear, focused questions
2. **Use keywords**: Include terms from documents
3. **One topic**: Ask about one thing at a time
4. **Provide context**: Give enough context for understanding

### System maintenance

1. **Regular updates**: Update dependencies monthly
2. **Monitor resources**: Check CPU, RAM, disk usage
3. **Backup data**: Backup Qdrant data daily
4. **Review logs**: Check for errors and warnings
5. **Test changes**: Test in staging before production

---

## Quick Reference

### Essential Commands

```bash
# Start system
docker-compose up -d
cd backend && npm run dev

# Stop system
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Pull models
docker exec -it ollama ollama pull llama3

# Check health
curl http://localhost:3000/api/health
```

### Essential Files

- `.env` - Configuration
- `docker-compose.yml` - Infrastructure
- `backend/src/server.ts` - Main server
- `backend/src/chat/chatService.ts` - RAG logic

### Essential Endpoints

- `GET /api/health` - Health check
- `POST /api/ingest` - Upload document
- `POST /api/chat` - Ask question

---

## Still Have Questions?

1. Check the documentation in the `docs/` folder
2. Search existing GitHub issues
3. Ask in the community forum
4. Open a new GitHub issue

We're here to help! 🚀

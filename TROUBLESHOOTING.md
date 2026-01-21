# Troubleshooting Guide

## Problem: Getting "I don't know" for every question

### Symptoms

```json
{
  "answer": "I don't know based on the provided documents. No relevant information was found.",
  "sources": []
}
```

### Root Cause

The similarity threshold is too high, so no documents are being retrieved even though they exist in the database.

### Solution 1: Lower the Similarity Threshold (Quick Fix)

Edit `backend/.env`:

```bash
# Change from 0.7 to 0.5
SIMILARITY_THRESHOLD=0.5
```

Then restart:

```bash
# Stop backend (Ctrl+C)
cd backend
npm run dev
```

### Solution 2: Re-ingest with Better Chunking (Recommended)

The improved document processor creates better chunks for CSV files:

```bash
# Stop backend (Ctrl+C)
docker-compose down

# Clear old data
docker volume rm rag-chatbot_qdrant_storage

# Start fresh
./start.sh
```

### How to Test

After applying the fix:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "When does the hackathon start?"}'
```

Expected response:

```json
{
  "answer": "The Hackathon starts at 08:00 AM on 30th January 2026.",
  "sources": ["Etihad AI Hackathon.csv (chunk 0)"]
}
```

---

## Understanding Similarity Scores

### What is Similarity Threshold?

The similarity threshold determines how closely a document chunk must match your question to be considered relevant.

- **0.9-1.0**: Nearly identical (very strict)
- **0.7-0.8**: High similarity (default, sometimes too strict)
- **0.5-0.6**: Moderate similarity (recommended for most cases)
- **0.3-0.4**: Low similarity (may include irrelevant results)

### Why CSV Files Have Lower Scores

CSV files are converted to text format, which can dilute semantic similarity:

**Original CSV:**

```csv
Question,Answer
What is the start time?,08:00 AM
```

**Converted to text (old method):**

```
CSV Data with 10 rows:
Columns: Question, Answer
Row 1:
  Question: What is the start time?
  Answer: 08:00 AM
Row 2:
  ...
```

The extra formatting text reduces the similarity score.

**New method (improved):**

```
Entry 1:
Question: What is the start time?
Answer: 08:00 AM

Entry 2:
...
```

This creates cleaner chunks with better semantic matching.

---

## Other Common Issues

### Issue: "Connection refused"

**Cause:** Backend not running

**Solution:**

```bash
./start.sh
```

### Issue: Empty response or timeout

**Cause:** Ollama models not loaded

**Solution:**

```bash
# Check if models are available
docker exec ollama ollama list

# Pull models if missing
docker exec ollama ollama pull llama3
docker exec ollama ollama pull nomic-embed-text
```

### Issue: "Collection not found"

**Cause:** Qdrant collection wasn't created

**Solution:**

```bash
# Restart to recreate collection
docker-compose down
./start.sh
```

### Issue: Documents not being ingested

**Cause:** Files in wrong location or wrong format

**Solution:**

```bash
# Check files are in correct location
ls -la backend/documents/

# Supported formats: .pdf, .csv, .txt, .md
# Move files if needed
mv your-file.csv backend/documents/
```

---

## Debugging Commands

### Check Qdrant Collection

```bash
# Get collection info
curl http://localhost:6333/collections/documents

# Check points count
curl http://localhost:6333/collections/documents | jq '.result.points_count'

# View stored documents
curl -X POST http://localhost:6333/collections/documents/points/scroll \
  -H 'Content-Type: application/json' \
  -d '{"limit": 5}' | jq '.'
```

### Test Embeddings

```bash
# Generate embedding for a test query
curl http://localhost:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "test"}' | jq '.embedding | length'

# Should return: 768
```

### Test Direct Search

```bash
# This tests if semantic search is working
# (requires jq and some bash scripting)

# 1. Generate query embedding
curl -s http://localhost:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "When does the hackathon start?"}' \
  > /tmp/query.json

# 2. Search Qdrant
curl -X POST http://localhost:6333/collections/documents/points/search \
  -H 'Content-Type: application/json' \
  -d "{\"vector\": $(cat /tmp/query.json | jq -c '.embedding'), \"limit\": 3}" \
  | jq '.result[] | {score: .score, source: .payload.source}'
```

### Check Backend Logs

If running with `npm run dev`, logs appear in the terminal.

Look for:

- "Ingesting: filename" - Document processing
- "✓ filename (X chunks)" - Successful ingestion
- "Retrieved X relevant chunks" - Search results
- Any error messages

---

## Performance Tuning

### Adjust Chunk Size

Smaller chunks = more precise but may miss context
Larger chunks = more context but less precise

Edit `backend/.env`:

```bash
# Default: 600 tokens
CHUNK_SIZE=400  # Smaller, more precise
CHUNK_SIZE=800  # Larger, more context
```

### Adjust Top K

Number of chunks to retrieve:

```bash
# Default: 5
TOP_K=3   # Faster, less context
TOP_K=10  # Slower, more context
```

### Adjust Similarity Threshold

```bash
# Strict (fewer results, higher quality)
SIMILARITY_THRESHOLD=0.7

# Balanced (recommended)
SIMILARITY_THRESHOLD=0.5

# Permissive (more results, may include irrelevant)
SIMILARITY_THRESHOLD=0.3
```

---

## Getting Help

1. Check this troubleshooting guide
2. Review logs for error messages
3. Test individual components (Qdrant, Ollama, embeddings)
4. Try with a simple test document
5. Check GitHub issues for similar problems

## Quick Reset

If all else fails, complete reset:

```bash
./cleanup-complete.sh
./start.sh
```

This removes everything and starts fresh.

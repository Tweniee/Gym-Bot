# Testing the API with curl

## ✅ Yes, the curl command works!

The curl command you provided is correct:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is in the documents?"}'
```

## Current Status

Your system is running and the API is responding. However, I noticed that the document embeddings weren't created properly during the initial ingestion.

**Issue found:** The CSV file was ingested but the vector embeddings are missing (indexed_vectors_count: 0)

## How to Fix

Simply restart the system to re-ingest with proper embeddings:

```bash
# Stop the backend (Ctrl+C in the terminal where it's running)

# Stop Docker
docker-compose down

# Start fresh
./start.sh
```

## Test Commands

Once restarted, try these commands:

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "services": {
    "ollama": "up",
    "qdrant": "up"
  }
}
```

### 2. List Documents

```bash
curl http://localhost:3000/api/documents
```

Expected response:

```json
{
  "documentsDirectory": "/path/to/backend/documents",
  "processedFiles": ["Etihad AI Hackathon.csv"],
  "message": "Place PDF, CSV, TXT, or MD files in the documents directory and restart to ingest"
}
```

### 3. Ask Questions

Based on your current CSV file (Etihad AI Hackathon), try:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "When does the hackathon start?"}'
```

Expected response:

```json
{
  "answer": "The Hackathon starts at 08:00 AM on 30th January 2026.",
  "sources": [
    {
      "text": "CSV Data with 10 rows...",
      "source": "Etihad AI Hackathon.csv",
      "score": 0.85
    }
  ],
  "question": "When does the hackathon start?"
}
```

More test questions:

```bash
# Where is the venue?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "Where is the venue?"}'

# What is the judging criteria?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is the judging criteria?"}'

# Can I work in a team?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "Can I work in a team?"}'
```

## Using jq for Pretty Output

If you have `jq` installed, pipe the output for better formatting:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "When does the hackathon start?"}' | jq '.'
```

## Alternative: Use the Test Script

```bash
chmod +x test-api.sh
./test-api.sh
```

This will run all tests automatically.

## Troubleshooting

**"Connection refused"**

- Make sure the backend is running: `./start.sh`

**"No relevant information found"**

- Restart the system to re-ingest documents with proper embeddings
- Make sure your question relates to the content in your CSV

**Empty sources array**

- The embeddings weren't created properly
- Restart with `./start.sh` to fix

## Why the Initial Issue Occurred

The document was processed and stored in Qdrant, but the vector embeddings (which enable semantic search) weren't created. This can happen if:

1. Ollama wasn't fully ready when ingestion started
2. The embedding model wasn't loaded yet
3. Network timing issue between services

**Solution:** Simply restart the system and it will re-ingest properly.

# Usage Guide

## Setup

1. **Add your documents to the documents folder:**

   ```bash
   cp your-file.pdf backend/documents/
   cp your-data.csv backend/documents/
   ```

2. **Start the system:**

   ```bash
   ./start.sh
   ```

   The system will:
   - Start Qdrant and Ollama in Docker
   - Pull required models (llama3 and nomic-embed-text)
   - Install backend dependencies
   - Automatically ingest all documents from `backend/documents/`
   - Start the API server on port 3000

## Using the API

### Check System Health

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "healthy",
  "services": {
    "ollama": "up",
    "qdrant": "up"
  },
  "timestamp": "2024-01-21T10:30:00.000Z"
}
```

### List Processed Documents

```bash
curl http://localhost:3000/api/documents
```

Response:

```json
{
  "documentsDirectory": "/path/to/backend/documents",
  "processedFiles": ["example.txt", "data.csv", "report.pdf"],
  "message": "Place PDF, CSV, TXT, or MD files in the documents directory and restart to ingest"
}
```

### Ask Questions

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is TechCorp?"}'
```

Response:

```json
{
  "answer": "TechCorp is a company founded in 2020 in San Francisco, California that specializes in artificial intelligence and machine learning solutions for enterprise clients.",
  "sources": [
    {
      "text": "Our company, TechCorp, was founded in 2020...",
      "source": "example.txt",
      "score": 0.85
    }
  ],
  "question": "What is TechCorp?"
}
```

## Example Workflow

### 1. Add a CSV file with product data

Create `backend/documents/products.csv`:

```csv
Product,Price,Category
Laptop,999,Electronics
Mouse,29,Electronics
Desk,299,Furniture
```

### 2. Restart the system

```bash
# Stop with Ctrl+C
docker-compose down
./start.sh
```

### 3. Query the data

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "What products do we have in the Electronics category?"}'
```

## Tips

- **Better answers**: Add more context to your documents
- **Multiple files**: The system combines information from all documents
- **CSV files**: Work great for structured data like product catalogs, customer lists, etc.
- **PDF files**: Perfect for reports, manuals, and documentation
- **Restart required**: New documents are only ingested on startup

## Stopping the System

1. Press `Ctrl+C` in the terminal running the backend
2. Stop Docker services:
   ```bash
   docker-compose down
   ```

## Troubleshooting

**No answer or poor quality?**

- Make sure your documents contain relevant information
- Try rephrasing your question
- Check that documents were successfully ingested in the startup logs

**Documents not ingesting?**

- Check file format (PDF, CSV, TXT, MD only)
- Look for errors in the console output
- Verify files are in `backend/documents/` folder

**System not starting?**

- Ensure Docker is running
- Check ports 3000, 6333, and 11434 are available
- Run `docker-compose logs` to see error messages

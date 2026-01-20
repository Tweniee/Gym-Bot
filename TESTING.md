# Testing Guide

## Quick Test Script

After starting the system, run these commands to verify everything works:

### 1. Check Health

```bash
curl http://localhost:3000/api/health
```

**Expected output**:

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

### 2. Create Test Document

```bash
cat > test-document.txt << 'EOF'
The Solar System consists of eight planets orbiting the Sun.
Mercury is the closest planet to the Sun and the smallest planet in our solar system.
Venus is the second planet from the Sun and is similar in size to Earth.
Earth is the third planet from the Sun and the only known planet with life.
Mars is the fourth planet from the Sun and is known as the Red Planet.
Jupiter is the fifth planet from the Sun and the largest planet in our solar system.
Saturn is the sixth planet from the Sun and is famous for its rings.
Uranus is the seventh planet from the Sun and rotates on its side.
Neptune is the eighth and farthest planet from the Sun.
EOF
```

### 3. Ingest Document

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test-document.txt"
```

**Expected output**:

```json
{
  "success": true,
  "filename": "test-document.txt",
  "chunks": 1
}
```

### 4. Test Question Answering

**Test 1: Simple factual question**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the largest planet in our solar system?"}'
```

**Expected**: Answer should mention Jupiter

**Test 2: Question requiring context**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Which planet is known as the Red Planet?"}'
```

**Expected**: Answer should mention Mars

**Test 3: "I don't know" test**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of France?"}'
```

**Expected**: Should return "I don't know" since this info is not in the document

### 5. Test PDF Upload

```bash
# If you have a PDF file
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@sample.pdf"
```

### 6. Test Error Handling

**Invalid file type**:

```bash
echo "test" > test.exe
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test.exe"
```

**Expected**: Error about invalid file type

**Empty question**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": ""}'
```

**Expected**: 400 error

## Automated Test Script

Save this as `test.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Starting RAG Chatbot Tests..."

# Test 1: Health Check
echo -e "\n📋 Test 1: Health Check"
response=$(curl -s "$BASE_URL/api/health")
if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi

# Test 2: Create test document
echo -e "\n📋 Test 2: Document Ingestion"
cat > /tmp/test-doc.txt << 'EOF'
The Eiffel Tower is located in Paris, France. It was built in 1889.
The Statue of Liberty is located in New York City, USA. It was a gift from France.
The Great Wall of China is one of the Seven Wonders of the World.
EOF

response=$(curl -s -X POST "$BASE_URL/api/ingest" -F "file=@/tmp/test-doc.txt")
if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Document ingestion passed${NC}"
else
    echo -e "${RED}✗ Document ingestion failed${NC}"
    echo "$response"
    exit 1
fi

# Wait for indexing
sleep 2

# Test 3: Question Answering
echo -e "\n📋 Test 3: Question Answering"
response=$(curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"question": "Where is the Eiffel Tower located?"}')

if echo "$response" | grep -qi "paris"; then
    echo -e "${GREEN}✓ Question answering passed${NC}"
else
    echo -e "${RED}✗ Question answering failed${NC}"
    echo "$response"
fi

# Test 4: "I don't know" response
echo -e "\n📋 Test 4: Unknown Question Handling"
response=$(curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"question": "What is the population of Mars?"}')

if echo "$response" | grep -qi "don't know"; then
    echo -e "${GREEN}✓ Unknown question handling passed${NC}"
else
    echo -e "${RED}✗ Unknown question handling failed${NC}"
    echo "$response"
fi

# Test 5: Invalid input
echo -e "\n📋 Test 5: Error Handling"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"question": ""}')

if echo "$response" | grep -q "400"; then
    echo -e "${GREEN}✓ Error handling passed${NC}"
else
    echo -e "${RED}✗ Error handling failed${NC}"
fi

# Cleanup
rm /tmp/test-doc.txt

echo -e "\n✅ All tests completed!"
```

Make it executable:

```bash
chmod +x test.sh
./test.sh
```

## Performance Testing

### Measure Ingestion Time

```bash
time curl -X POST http://localhost:3000/api/ingest \
  -F "file=@large-document.pdf"
```

**Expected**:

- Small file (1-2 pages): 2-5 seconds
- Medium file (10-20 pages): 10-30 seconds
- Large file (50+ pages): 1-3 minutes

### Measure Chat Latency

```bash
time curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic?"}'
```

**Expected**: 5-15 seconds (depends on LLM model size)

### Load Testing with Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils  # Ubuntu/Debian
brew install httpd                   # macOS

# Test chat endpoint
ab -n 100 -c 10 -p question.json -T application/json \
  http://localhost:3000/api/chat
```

Where `question.json` contains:

```json
{ "question": "What is the main topic?" }
```

## Integration Testing

### Test Complete RAG Pipeline

```bash
#!/bin/bash

# 1. Ingest multiple documents
for file in doc1.txt doc2.txt doc3.txt; do
    curl -X POST http://localhost:3000/api/ingest -F "file=@$file"
    sleep 1
done

# 2. Ask questions that require information from different documents
questions=(
    "What is mentioned in doc1?"
    "What is mentioned in doc2?"
    "What is mentioned in doc3?"
    "What is the relationship between doc1 and doc2?"
)

for question in "${questions[@]}"; do
    echo "Question: $question"
    curl -X POST http://localhost:3000/api/chat \
        -H "Content-Type: application/json" \
        -d "{\"question\": \"$question\"}"
    echo -e "\n---\n"
done
```

### Test Source Attribution

```bash
# Ingest document
curl -X POST http://localhost:3000/api/ingest -F "file=@test.txt"

# Ask question and check sources
response=$(curl -s -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"question": "What is the main topic?"}')

# Verify sources are included
if echo "$response" | grep -q "sources"; then
    echo "✓ Sources included in response"
else
    echo "✗ Sources missing from response"
fi
```

## Manual Testing Checklist

### Functional Tests

- [ ] Health endpoint returns correct status
- [ ] Can upload .txt file
- [ ] Can upload .md file
- [ ] Can upload .pdf file
- [ ] Invalid file types are rejected
- [ ] Large files are handled correctly
- [ ] Empty files are rejected
- [ ] Questions return relevant answers
- [ ] Sources are correctly attributed
- [ ] "I don't know" works for unanswerable questions
- [ ] Empty questions are rejected
- [ ] Very long questions are handled

### Edge Cases

- [ ] Document with no text
- [ ] Document with special characters
- [ ] Document with multiple languages
- [ ] Very short document (< 100 chars)
- [ ] Very long document (> 100 pages)
- [ ] Question with special characters
- [ ] Question in different language
- [ ] Multiple concurrent requests
- [ ] Repeated identical questions

### Error Scenarios

- [ ] Ollama is down
- [ ] Qdrant is down
- [ ] Network timeout
- [ ] Out of memory
- [ ] Disk full
- [ ] Invalid JSON in request
- [ ] Missing required fields
- [ ] Malformed file

## Debugging

### Enable Debug Logging

Add to `.env`:

```env
LOG_LEVEL=debug
```

### Check Ollama Logs

```bash
docker logs ollama
```

### Check Qdrant Logs

```bash
docker logs qdrant
```

### Check Backend Logs

```bash
# If running with npm
npm run dev

# If running with Docker
docker logs rag-backend
```

### Inspect Qdrant Collection

```bash
# List collections
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/documents

# Count points
curl http://localhost:6333/collections/documents/points/count
```

### Test Ollama Directly

```bash
# Test embedding
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test"
}'

# Test chat
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

## Common Issues

### Issue: "Model not found"

**Solution**:

```bash
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull nomic-embed-text
```

### Issue: "Connection refused"

**Solution**:

```bash
# Check services are running
docker ps

# Restart services
docker-compose restart
```

### Issue: Slow responses

**Solution**:

- Enable GPU support in docker-compose.yml
- Use smaller model (llama3:8b)
- Reduce TOP_K and CHUNK_SIZE

### Issue: Out of memory

**Solution**:

```bash
# Increase Docker memory limit
docker update --memory 8g ollama

# Or use smaller model
docker exec -it ollama ollama pull llama3:8b
```

## Continuous Testing

### GitHub Actions Example

```yaml
name: Test RAG Chatbot

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Pull models
        run: |
          docker exec ollama ollama pull llama3
          docker exec ollama ollama pull nomic-embed-text

      - name: Run tests
        run: ./test.sh

      - name: Stop services
        run: docker-compose down
```

## Test Coverage Goals

- **Unit tests**: 80%+ coverage
- **Integration tests**: All API endpoints
- **E2E tests**: Complete RAG pipeline
- **Performance tests**: Baseline metrics
- **Security tests**: Input validation

## Next Steps

After testing:

1. Document any issues found
2. Create bug reports
3. Implement fixes
4. Add automated tests
5. Set up CI/CD pipeline

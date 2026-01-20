# Examples & Use Cases

## Example 1: Technical Documentation Q&A

### Scenario

You have API documentation and want to answer developer questions.

### Setup

```bash
# Upload API documentation
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@api-docs.md"
```

### Sample Questions

```bash
# Question 1: Authentication
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I authenticate API requests?"}'

# Question 2: Rate limits
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the rate limits?"}'

# Question 3: Error codes
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What does error code 429 mean?"}'
```

---

## Example 2: Research Paper Analysis

### Scenario

Analyze multiple research papers and answer questions about them.

### Setup

```bash
# Upload multiple papers
curl -X POST http://localhost:3000/api/ingest -F "file=@paper1.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@paper2.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@paper3.pdf"
```

### Sample Questions

```bash
# Question 1: Methodology
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What methodology was used in the experiments?"}'

# Question 2: Results comparison
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Compare the results from paper1 and paper2"}'

# Question 3: Limitations
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main limitations mentioned?"}'
```

---

## Example 3: Company Policy Assistant

### Scenario

Help employees understand company policies.

### Setup

```bash
# Upload policy documents
curl -X POST http://localhost:3000/api/ingest -F "file=@employee-handbook.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@vacation-policy.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@remote-work-policy.pdf"
```

### Sample Questions

```bash
# Question 1: Vacation days
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How many vacation days do I get per year?"}'

# Question 2: Remote work
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the remote work policy?"}'

# Question 3: Benefits
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What health insurance options are available?"}'
```

---

## Example 4: Legal Document Review

### Scenario

Answer questions about contracts and legal documents.

### Setup

```bash
# Upload legal documents
curl -X POST http://localhost:3000/api/ingest -F "file=@contract.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@terms-of-service.pdf"
```

### Sample Questions

```bash
# Question 1: Termination clause
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the termination conditions?"}'

# Question 2: Liability
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Who is liable for damages?"}'

# Question 3: Payment terms
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the payment terms?"}'
```

---

## Example 5: Educational Content

### Scenario

Create a study assistant for educational materials.

### Setup

```bash
# Upload textbook chapters
curl -X POST http://localhost:3000/api/ingest -F "file=@chapter1-intro.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@chapter2-basics.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@chapter3-advanced.pdf"
```

### Sample Questions

```bash
# Question 1: Concept explanation
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Explain the concept of recursion"}'

# Question 2: Examples
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Give me an example of a recursive function"}'

# Question 3: Applications
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are real-world applications of this concept?"}'
```

---

## Example 6: Product Manual Assistant

### Scenario

Help users understand product features and troubleshooting.

### Setup

```bash
# Upload product manuals
curl -X POST http://localhost:3000/api/ingest -F "file=@user-manual.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@troubleshooting-guide.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@faq.md"
```

### Sample Questions

```bash
# Question 1: Setup
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I set up the device?"}'

# Question 2: Troubleshooting
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "The device won'\''t turn on. What should I do?"}'

# Question 3: Features
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main features?"}'
```

---

## Example 7: Meeting Notes Search

### Scenario

Search through meeting notes and minutes.

### Setup

```bash
# Upload meeting notes
curl -X POST http://localhost:3000/api/ingest -F "file=@meeting-2024-01-15.md"
curl -X POST http://localhost:3000/api/ingest -F "file=@meeting-2024-01-22.md"
curl -X POST http://localhost:3000/api/ingest -F "file=@meeting-2024-01-29.md"
```

### Sample Questions

```bash
# Question 1: Action items
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What action items were assigned to John?"}'

# Question 2: Decisions
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What decisions were made about the new feature?"}'

# Question 3: Timeline
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "When is the project deadline?"}'
```

---

## Example 8: Code Documentation

### Scenario

Answer questions about codebase documentation.

### Setup

```bash
# Upload code documentation
curl -X POST http://localhost:3000/api/ingest -F "file=@architecture.md"
curl -X POST http://localhost:3000/api/ingest -F "file=@api-reference.md"
curl -X POST http://localhost:3000/api/ingest -F "file=@contributing.md"
```

### Sample Questions

```bash
# Question 1: Architecture
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the system architecture?"}'

# Question 2: Contributing
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I contribute to the project?"}'

# Question 3: API usage
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I use the authentication API?"}'
```

---

## Testing "I Don't Know" Responses

### Scenario

Verify the system correctly handles unanswerable questions.

### Setup

```bash
# Upload a document about solar system
cat > solar-system.txt << 'EOF'
The Solar System consists of eight planets orbiting the Sun.
Mercury is the closest planet to the Sun.
Venus is the second planet from the Sun.
Earth is the third planet and the only one with life.
Mars is known as the Red Planet.
Jupiter is the largest planet.
Saturn is famous for its rings.
Uranus rotates on its side.
Neptune is the farthest planet from the Sun.
EOF

curl -X POST http://localhost:3000/api/ingest -F "file=@solar-system.txt"
```

### Questions That Should Return "I Don't Know"

```bash
# Question about unrelated topic
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of France?"}'

# Question about specific detail not in document
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the exact distance from Earth to Mars?"}'

# Question about future events
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "When will humans colonize Mars?"}'
```

**Expected Response**: "I don't know based on the provided documents..."

---

## Advanced Use Cases

### Multi-Document Synthesis

Upload related documents and ask questions that require synthesizing information:

```bash
# Upload multiple related documents
curl -X POST http://localhost:3000/api/ingest -F "file=@intro.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@methods.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@results.pdf"

# Ask synthesis question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Summarize the complete research methodology and results"}'
```

### Comparative Analysis

```bash
# Upload competing product specs
curl -X POST http://localhost:3000/api/ingest -F "file=@product-a-specs.pdf"
curl -X POST http://localhost:3000/api/ingest -F "file=@product-b-specs.pdf"

# Compare features
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Compare the battery life of Product A and Product B"}'
```

### Timeline Extraction

```bash
# Upload historical documents
curl -X POST http://localhost:3000/api/ingest -F "file=@project-history.md"

# Extract timeline
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the timeline of major project milestones?"}'
```

---

## Integration Examples

### Python Integration

```python
import requests

# Upload document
with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/api/ingest',
        files={'file': f}
    )
    print(response.json())

# Ask question
response = requests.post(
    'http://localhost:3000/api/chat',
    json={'question': 'What is the main topic?'}
)
result = response.json()
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

### JavaScript Integration

```javascript
// Upload document
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const uploadResponse = await fetch("http://localhost:3000/api/ingest", {
  method: "POST",
  body: formData,
});
const uploadResult = await uploadResponse.json();
console.log(uploadResult);

// Ask question
const chatResponse = await fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: "What is the main topic?" }),
});
const chatResult = await chatResponse.json();
console.log("Answer:", chatResult.answer);
console.log("Sources:", chatResult.sources);
```

### cURL Batch Processing

```bash
#!/bin/bash
# batch-ingest.sh - Upload multiple documents

for file in documents/*.pdf; do
    echo "Uploading $file..."
    curl -X POST http://localhost:3000/api/ingest \
        -F "file=@$file"
    sleep 1
done

echo "All documents uploaded!"
```

---

## Performance Testing Examples

### Load Test with Apache Bench

```bash
# Create test payload
echo '{"question": "What is the main topic?"}' > question.json

# Run load test
ab -n 100 -c 10 \
   -p question.json \
   -T application/json \
   http://localhost:3000/api/chat
```

### Stress Test Script

```bash
#!/bin/bash
# stress-test.sh

for i in {1..100}; do
    curl -X POST http://localhost:3000/api/chat \
        -H "Content-Type: application/json" \
        -d '{"question": "Test question '$i'"}' &
done

wait
echo "Stress test complete"
```

---

## Troubleshooting Examples

### Debug Embedding Generation

```bash
# Test Ollama directly
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test text"
}'
```

### Debug Vector Search

```bash
# Check Qdrant collection
curl http://localhost:6333/collections/documents

# Count vectors
curl http://localhost:6333/collections/documents/points/count
```

### Debug Chat Generation

```bash
# Test Ollama chat directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

---

## Best Practices

### Document Preparation

1. **Clean formatting**: Remove unnecessary whitespace
2. **Clear structure**: Use headings and sections
3. **Consistent style**: Maintain uniform formatting
4. **Relevant content**: Only include necessary information

### Question Formulation

1. **Be specific**: "What is the refund policy?" vs "Tell me about refunds"
2. **Use keywords**: Include terms from the documents
3. **One topic**: Ask about one thing at a time
4. **Clear context**: Provide enough context for understanding

### System Optimization

1. **Chunk size**: Adjust based on document type
2. **Overlap**: Increase for dense technical content
3. **Top-K**: Increase for broader context
4. **Threshold**: Adjust based on precision needs

---

## Common Patterns

### Pattern 1: Fact Extraction

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is [specific fact]?"}'
```

### Pattern 2: Comparison

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Compare [A] and [B]"}'
```

### Pattern 3: Summarization

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Summarize the main points about [topic]"}'
```

### Pattern 4: Procedure

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I [perform action]?"}'
```

---

## Next Steps

After trying these examples:

1. Experiment with your own documents
2. Adjust RAG parameters for your use case
3. Build custom integrations
4. Add domain-specific enhancements
5. Share your use cases with the community!

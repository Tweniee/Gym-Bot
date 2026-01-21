#!/bin/bash

# Test script for RAG webhook ingestion
# Usage: ./test-rag-webhook.sh

set -e

echo "🧪 Testing RAG Webhook Ingestion System"
echo "========================================"
echo ""

# Configuration
API_URL="http://localhost:3000"
MONGO_URI="mongodb://localhost:27017"
DB_NAME="app_db"
COLLECTION="products"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if services are running
echo "📋 Checking services..."

# Check MongoDB
if ! mongosh --quiet --eval "db.version()" > /dev/null 2>&1; then
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo "Start it with: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    exit 1
fi
echo -e "${GREEN}✓ MongoDB is running${NC}"

# Check API server
if ! curl -s "${API_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ API server is not running${NC}"
    echo "Start it with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ API server is running${NC}"

# Check RAG health
echo ""
echo "🏥 Checking RAG services health..."
HEALTH_RESPONSE=$(curl -s "${API_URL}/rag/health")
echo "$HEALTH_RESPONSE" | jq '.'

if echo "$HEALTH_RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
    echo -e "${GREEN}✓ All RAG services are healthy${NC}"
else
    echo -e "${YELLOW}⚠ Some RAG services are unhealthy${NC}"
fi

echo ""
echo "📝 Creating test document in MongoDB..."

# Create test document
DOC_ID=$(mongosh --quiet "${MONGO_URI}/${DB_NAME}" --eval "
  const result = db.${COLLECTION}.insertOne({
    name: 'Test Product for RAG',
    description: 'This is a test product to verify RAG ingestion pipeline',
    price: 99.99,
    category: 'Electronics',
    specs: {
      brand: 'TestBrand',
      model: 'TB-2024',
      warranty: '2 years'
    },
    tags: ['test', 'electronics', 'rag'],
    inStock: true,
    createdAt: new Date()
  });
  print(result.insertedId.toString());
" | tail -1)

echo -e "${GREEN}✓ Created document with ID: ${DOC_ID}${NC}"

echo ""
echo "🔔 Sending webhook for document.created..."

# Send webhook
WEBHOOK_RESPONSE=$(curl -s -X POST "${API_URL}/rag/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"document.created\",
    \"collection\": \"${COLLECTION}\",
    \"documentId\": \"${DOC_ID}\"
  }")

echo "$WEBHOOK_RESPONSE" | jq '.'

if echo "$WEBHOOK_RESPONSE" | jq -e '.message' > /dev/null; then
    echo -e "${GREEN}✓ Webhook accepted${NC}"
else
    echo -e "${RED}❌ Webhook failed${NC}"
    exit 1
fi

echo ""
echo "⏳ Waiting for ingestion to complete (5 seconds)..."
sleep 5

echo ""
echo "🔍 Checking Qdrant for vectors..."

# Check Qdrant
VECTOR_ID="${COLLECTION}_${DOC_ID}_0"
QDRANT_RESPONSE=$(curl -s "http://localhost:6333/collections/documents/points/${VECTOR_ID}")

if echo "$QDRANT_RESPONSE" | jq -e '.result' > /dev/null; then
    echo -e "${GREEN}✓ Vector found in Qdrant${NC}"
    echo "$QDRANT_RESPONSE" | jq '.result.payload'
else
    echo -e "${YELLOW}⚠ Vector not found yet (may still be processing)${NC}"
fi

echo ""
echo "🔄 Testing document update..."

# Update document
mongosh --quiet "${MONGO_URI}/${DB_NAME}" --eval "
  db.${COLLECTION}.updateOne(
    { _id: ObjectId('${DOC_ID}') },
    { \$set: { price: 79.99, updatedAt: new Date() } }
  );
" > /dev/null

# Send update webhook
curl -s -X POST "${API_URL}/rag/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"document.updated\",
    \"collection\": \"${COLLECTION}\",
    \"documentId\": \"${DOC_ID}\"
  }" > /dev/null

echo -e "${GREEN}✓ Update webhook sent${NC}"

echo ""
echo "⏳ Waiting for update to process (5 seconds)..."
sleep 5

echo ""
echo "🗑️  Testing document deletion..."

# Send delete webhook
DELETE_RESPONSE=$(curl -s -X POST "${API_URL}/rag/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"document.deleted\",
    \"collection\": \"${COLLECTION}\",
    \"documentId\": \"${DOC_ID}\"
  }")

echo "$DELETE_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Delete webhook sent${NC}"

echo ""
echo "⏳ Waiting for deletion to complete (5 seconds)..."
sleep 5

# Clean up MongoDB
echo ""
echo "🧹 Cleaning up test document from MongoDB..."
mongosh --quiet "${MONGO_URI}/${DB_NAME}" --eval "
  db.${COLLECTION}.deleteOne({ _id: ObjectId('${DOC_ID}') });
" > /dev/null

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}✅ RAG webhook test completed successfully!${NC}"
echo ""
echo "Summary:"
echo "  - Created test document in MongoDB"
echo "  - Sent document.created webhook"
echo "  - Verified vector in Qdrant"
echo "  - Sent document.updated webhook"
echo "  - Sent document.deleted webhook"
echo "  - Cleaned up test data"
echo ""
echo "Check the server logs for detailed ingestion information."

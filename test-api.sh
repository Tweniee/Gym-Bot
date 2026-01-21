#!/bin/bash

# Simple script to test the RAG API

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3000"

echo -e "${BLUE}Testing RAG Chatbot API${NC}\n"

# Test 1: Health check
echo -e "${GREEN}1. Health Check${NC}"
curl -s "$API_URL/api/health" | jq '.'
echo -e "\n"

# Test 2: List documents
echo -e "${GREEN}2. List Processed Documents${NC}"
curl -s "$API_URL/api/documents" | jq '.'
echo -e "\n"

# Test 3: Ask a question
echo -e "${GREEN}3. Ask a Question${NC}"
echo "Question: What is the average age of gym members?"
curl -s -X POST "$API_URL/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is the average age of gym members?"}' | jq '.'
echo -e "\n"

# Test 4: Another question
echo -e "${GREEN}4. Ask Another Question${NC}"
echo "Question: What workout types are tracked in the data?"
curl -s -X POST "$API_URL/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{"question": "What workout types are tracked in the data?"}' | jq '.'
echo -e "\n"

echo -e "${BLUE}Testing complete!${NC}"

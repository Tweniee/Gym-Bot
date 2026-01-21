#!/bin/bash

# RAG Chatbot - Start Script
# Starts Docker services, pulls models, and runs the backend

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${1}${2}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "========================================="
    print_message "$BLUE" "$1"
    print_message "$BLUE" "========================================="
    echo ""
}

print_success() { print_message "$GREEN" "✓ $1"; }
print_error() { print_message "$RED" "✗ $1"; }
print_info() { print_message "$BLUE" "ℹ $1"; }

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_header "🤖 RAG Chatbot - Starting"

# Check prerequisites
print_info "Checking prerequisites..."
command_exists docker || { print_error "Docker not installed"; exit 1; }
command_exists node || { print_error "Node.js not installed"; exit 1; }
print_success "Prerequisites OK"

# Start Docker services
print_header "Starting Docker Services"
print_info "Starting Qdrant and Ollama..."
docker-compose up -d
sleep 5

docker ps | grep -q "qdrant" && print_success "Qdrant running" || { print_error "Qdrant failed"; exit 1; }
docker ps | grep -q "ollama" && print_success "Ollama running" || { print_error "Ollama failed"; exit 1; }

# Pull models
print_header "Checking Ollama Models"

if docker exec ollama ollama list | grep -q "llama3"; then
    print_success "llama3 model ready"
else
    print_info "Pulling llama3 model (~4.7GB, this may take a while)..."
    docker exec ollama ollama pull llama3
    print_success "llama3 downloaded"
fi

if docker exec ollama ollama list | grep -q "nomic-embed-text"; then
    print_success "nomic-embed-text model ready"
else
    print_info "Pulling nomic-embed-text model (~274MB)..."
    docker exec ollama ollama pull nomic-embed-text
    print_success "nomic-embed-text downloaded"
fi

# Setup backend
print_header "Setting Up Backend"
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    print_success ".env created"
else
    print_success ".env exists"
fi

if [ ! -d node_modules ]; then
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies ready"
fi

cd ..

# Start backend
print_header "Starting Backend"
print_info "Starting server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

sleep 5

# Health check
print_info "Running health check..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
        if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
            print_success "System healthy!"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Health check failed"
        exit 1
    fi
    
    print_info "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

# Display info
print_header "🎉 RAG Chatbot Ready!"

echo ""
print_success "Backend API: http://localhost:3000"
echo ""
print_info "📁 Documents Directory: backend/documents/"
print_info "   Place your PDF, CSV, TXT, or MD files there and restart"
echo ""
print_info "🔌 API Endpoints:"
echo "   GET  /api/health     - Check system status"
echo "   GET  /api/documents  - List processed documents"
echo "   POST /api/chat       - Ask questions"
echo ""
print_info "💬 Example Query:"
echo "   curl -X POST http://localhost:3000/api/chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"question\": \"What is in the documents?\"}'"
echo ""
print_info "🛑 To stop:"
echo "   Press Ctrl+C, then run: docker-compose down"
echo ""
print_success "Ready to answer questions! 🚀"
echo ""

wait $BACKEND_PID

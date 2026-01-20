#!/bin/bash

# RAG Chatbot - Quick Start Script
# This script sets up and starts the entire RAG chatbot system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "=================================="
    print_message "$BLUE" "$1"
    print_message "$BLUE" "=================================="
    echo ""
}

print_success() {
    print_message "$GREEN" "✓ $1"
}

print_error() {
    print_message "$RED" "✗ $1"
}

print_warning() {
    print_message "$YELLOW" "⚠ $1"
}

print_info() {
    print_message "$BLUE" "ℹ $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main script
print_header "🤖 RAG Chatbot - Quick Start"

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"

if command_exists docker; then
    print_success "Docker is installed"
else
    print_error "Docker is not installed"
    print_info "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    print_success "Docker Compose is installed"
else
    print_error "Docker Compose is not installed"
    print_info "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js is installed ($NODE_VERSION)"
else
    print_error "Node.js is not installed"
    print_info "Please install Node.js 20+: https://nodejs.org/"
    exit 1
fi

if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_success "npm is installed ($NPM_VERSION)"
else
    print_error "npm is not installed"
    exit 1
fi

# Step 2: Start Docker services
print_header "Step 2: Starting Docker Services"

print_info "Starting Qdrant and Ollama..."
docker-compose up -d

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 5

# Check if services are running
if docker ps | grep -q "qdrant"; then
    print_success "Qdrant is running"
else
    print_error "Qdrant failed to start"
    exit 1
fi

if docker ps | grep -q "ollama"; then
    print_success "Ollama is running"
else
    print_error "Ollama failed to start"
    exit 1
fi

# Step 3: Pull Ollama models
print_header "Step 3: Pulling Ollama Models"

print_info "Checking if models are already downloaded..."

# Check if llama3 exists
if docker exec ollama ollama list | grep -q "llama3"; then
    print_success "llama3 model already exists"
else
    print_info "Pulling llama3 model (this may take a while - ~4.7GB)..."
    docker exec ollama ollama pull llama3
    print_success "llama3 model downloaded"
fi

# Check if nomic-embed-text exists
if docker exec ollama ollama list | grep -q "nomic-embed-text"; then
    print_success "nomic-embed-text model already exists"
else
    print_info "Pulling nomic-embed-text model (~274MB)..."
    docker exec ollama ollama pull nomic-embed-text
    print_success "nomic-embed-text model downloaded"
fi

# Step 4: Set up backend
print_header "Step 4: Setting Up Backend"

cd backend

# Check if .env exists
if [ ! -f .env ]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    print_success ".env file created"
else
    print_success ".env file already exists"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    print_info "Installing dependencies (this may take a minute)..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

cd ..

# Step 5: Start backend
print_header "Step 5: Starting Backend Server"

print_info "Starting backend in development mode..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
print_info "Waiting for backend to start..."
sleep 5

# Step 6: Health check
print_header "Step 6: Running Health Check"

MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
        if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
            print_success "System is healthy!"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Health check failed after $MAX_RETRIES attempts"
        print_info "Check logs with: docker-compose logs"
        exit 1
    fi
    
    print_info "Waiting for system to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

# Step 7: Display information
print_header "🎉 Setup Complete!"

echo ""
print_success "RAG Chatbot is now running!"
echo ""
print_info "Backend API: http://localhost:3000"
print_info "Frontend: Open frontend/index.html in your browser"
echo ""
print_info "API Endpoints:"
echo "  - Health: GET  http://localhost:3000/api/health"
echo "  - Ingest: POST http://localhost:3000/api/ingest"
echo "  - Chat:   POST http://localhost:3000/api/chat"
echo ""
print_info "Quick Test:"
echo "  1. Create a test file:"
echo "     echo 'The Eiffel Tower is in Paris.' > test.txt"
echo ""
echo "  2. Upload the file:"
echo "     curl -X POST http://localhost:3000/api/ingest -F 'file=@test.txt'"
echo ""
echo "  3. Ask a question:"
echo "     curl -X POST http://localhost:3000/api/chat \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"question\": \"Where is the Eiffel Tower?\"}'"
echo ""
print_info "To stop the system:"
echo "  - Press Ctrl+C to stop the backend"
echo "  - Run: docker-compose down"
echo ""
print_info "Documentation:"
echo "  - README.md - Quick start guide"
echo "  - ARCHITECTURE.md - System design"
echo "  - TESTING.md - Testing guide"
echo "  - DEPLOYMENT.md - Deployment guide"
echo ""
print_success "Happy chatting! 🚀"
echo ""

# Keep script running
print_info "Press Ctrl+C to stop the backend server..."
wait $BACKEND_PID

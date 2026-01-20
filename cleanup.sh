#!/bin/bash

# RAG Chatbot - Cleanup Script
# This script removes everything created by start.sh

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

# Confirmation prompt
confirm_cleanup() {
    echo ""
    print_warning "⚠️  WARNING: This will remove:"
    echo "  - All Docker containers (qdrant, ollama)"
    echo "  - All Docker volumes (including Ollama models)"
    echo "  - Backend node_modules"
    echo "  - Backend .env file"
    echo "  - Uploaded files"
    echo "  - All downloaded data"
    echo ""
    print_warning "This action CANNOT be undone!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Cleanup cancelled."
        exit 0
    fi
}

# Main cleanup
print_header "🧹 RAG Chatbot - Cleanup"

confirm_cleanup

print_header "Step 1: Stopping Backend Server"

# Kill backend process if running
if pgrep -f "tsx watch src/server.ts" > /dev/null; then
    print_info "Stopping backend server..."
    pkill -f "tsx watch src/server.ts" || true
    print_success "Backend server stopped"
else
    print_info "Backend server not running"
fi

# Also try to kill any node processes running the server
if pgrep -f "node.*server" > /dev/null; then
    print_info "Stopping node server processes..."
    pkill -f "node.*server" || true
    print_success "Node processes stopped"
fi

print_header "Step 2: Stopping Docker Containers"

if command -v docker-compose >/dev/null 2>&1; then
    print_info "Stopping Docker Compose services..."
    docker-compose down -v 2>/dev/null || true
    print_success "Docker Compose services stopped"
elif docker compose version >/dev/null 2>&1; then
    print_info "Stopping Docker Compose services..."
    docker compose down -v 2>/dev/null || true
    print_success "Docker Compose services stopped"
fi

# Stop individual containers if they're still running
print_info "Stopping individual containers..."
docker stop qdrant 2>/dev/null || true
docker stop ollama 2>/dev/null || true
print_success "Individual containers stopped"

print_header "Step 3: Removing Docker Containers"

print_info "Removing containers..."
docker rm -f qdrant 2>/dev/null || true
docker rm -f ollama 2>/dev/null || true
print_success "Containers removed"

print_header "Step 4: Removing Docker Volumes"

print_info "Removing Docker volumes (this includes Ollama models)..."
docker volume rm rag-chatbot_qdrant_storage 2>/dev/null || true
docker volume rm rag-chatbot_ollama_data 2>/dev/null || true

# Also try alternative volume names
docker volume rm qdrant_storage 2>/dev/null || true
docker volume rm ollama_data 2>/dev/null || true

# List and remove any volumes that might be related
print_info "Checking for related volumes..."
docker volume ls | grep -E "(qdrant|ollama)" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

print_success "Docker volumes removed"

print_header "Step 5: Removing Docker Networks"

print_info "Removing Docker networks..."
docker network rm rag-network 2>/dev/null || true
docker network rm rag-chatbot_rag-network 2>/dev/null || true
print_success "Docker networks removed"

print_header "Step 6: Cleaning Backend Files"

if [ -d "backend/node_modules" ]; then
    print_info "Removing node_modules..."
    rm -rf backend/node_modules
    print_success "node_modules removed"
else
    print_info "node_modules not found"
fi

if [ -f "backend/.env" ]; then
    print_info "Removing .env file..."
    rm -f backend/.env
    print_success ".env file removed"
else
    print_info ".env file not found"
fi

if [ -f "backend/package-lock.json" ]; then
    print_info "Removing package-lock.json..."
    rm -f backend/package-lock.json
    print_success "package-lock.json removed"
fi

if [ -d "backend/dist" ]; then
    print_info "Removing dist folder..."
    rm -rf backend/dist
    print_success "dist folder removed"
fi

print_header "Step 7: Cleaning Upload Directory"

if [ -d "backend/uploads" ]; then
    print_info "Removing uploads directory..."
    rm -rf backend/uploads
    print_success "uploads directory removed"
else
    print_info "uploads directory not found"
fi

if [ -d "uploads" ]; then
    print_info "Removing root uploads directory..."
    rm -rf uploads
    print_success "Root uploads directory removed"
fi

print_header "Step 8: Removing Test Files"

print_info "Removing test files..."
rm -f test.txt test.csv test.md test.pdf 2>/dev/null || true
rm -f test-*.txt test-*.csv test-*.md test-*.pdf 2>/dev/null || true
print_success "Test files removed"

print_header "Step 9: Docker System Cleanup (Optional)"

read -p "Do you want to prune unused Docker resources? (yes/no): " prune_docker

if [ "$prune_docker" = "yes" ]; then
    print_info "Pruning Docker system..."
    docker system prune -f
    print_success "Docker system pruned"
else
    print_info "Skipping Docker system prune"
fi

print_header "Step 10: Verification"

print_info "Verifying cleanup..."

# Check if containers are gone
if docker ps -a | grep -E "(qdrant|ollama)" > /dev/null; then
    print_warning "Some containers still exist"
    docker ps -a | grep -E "(qdrant|ollama)"
else
    print_success "All containers removed"
fi

# Check if volumes are gone
if docker volume ls | grep -E "(qdrant|ollama)" > /dev/null; then
    print_warning "Some volumes still exist"
    docker volume ls | grep -E "(qdrant|ollama)"
else
    print_success "All volumes removed"
fi

# Check if backend files are gone
if [ -d "backend/node_modules" ] || [ -f "backend/.env" ]; then
    print_warning "Some backend files still exist"
else
    print_success "All backend files removed"
fi

print_header "✅ Cleanup Complete!"

echo ""
print_success "All resources have been cleaned up!"
echo ""
print_info "What was removed:"
echo "  ✓ Docker containers (qdrant, ollama)"
echo "  ✓ Docker volumes (including all Ollama models)"
echo "  ✓ Docker networks"
echo "  ✓ Backend node_modules"
echo "  ✓ Backend .env file"
echo "  ✓ Uploaded files"
echo "  ✓ Test files"
echo ""
print_info "What was NOT removed:"
echo "  • Source code files"
echo "  • Documentation files"
echo "  • docker-compose.yml"
echo "  • package.json"
echo ""
print_info "To start fresh, run:"
echo "  ./start.sh"
echo ""
print_success "Cleanup finished! 🎉"
echo ""

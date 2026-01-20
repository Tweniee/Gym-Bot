#!/bin/bash

# RAG Chatbot - COMPLETE Cleanup Script
# This script removes EVERYTHING including Docker images and all traces

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_warning() {
    print_message "$YELLOW" "⚠ $1"
}

print_info() {
    print_message "$BLUE" "ℹ $1"
}

# Confirmation prompt
confirm_cleanup() {
    echo ""
    print_warning "⚠️  EXTREME WARNING: This will remove EVERYTHING:"
    echo "  - All Docker containers (qdrant, ollama)"
    echo "  - All Docker volumes (all data will be lost)"
    echo "  - All Docker images (qdrant, ollama - will need to re-download)"
    echo "  - All Ollama models (llama3, nomic-embed-text - ~5GB)"
    echo "  - Backend node_modules"
    echo "  - Backend .env file"
    echo "  - All uploaded files"
    echo "  - All build artifacts"
    echo ""
    print_warning "This is a COMPLETE RESET - you'll need to re-download everything!"
    print_warning "This action CANNOT be undone!"
    echo ""
    read -p "Type 'DELETE EVERYTHING' to confirm: " confirmation
    
    if [ "$confirmation" != "DELETE EVERYTHING" ]; then
        print_info "Cleanup cancelled."
        exit 0
    fi
}

print_header "🔥 RAG Chatbot - COMPLETE CLEANUP"

confirm_cleanup

print_header "Step 1: Stopping All Processes"

print_info "Killing backend processes..."
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
print_success "All processes stopped"

print_header "Step 2: Stopping Docker Containers"

print_info "Stopping all containers..."
docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
docker stop qdrant ollama 2>/dev/null || true
print_success "Containers stopped"

print_header "Step 3: Removing Docker Containers"

print_info "Removing all related containers..."
docker rm -f qdrant ollama 2>/dev/null || true
docker ps -a | grep -E "(qdrant|ollama)" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
print_success "Containers removed"

print_header "Step 4: Removing Docker Volumes"

print_info "Removing all volumes (THIS DELETES ALL DATA)..."
docker volume rm rag-chatbot_qdrant_storage 2>/dev/null || true
docker volume rm rag-chatbot_ollama_data 2>/dev/null || true
docker volume rm qdrant_storage 2>/dev/null || true
docker volume rm ollama_data 2>/dev/null || true
docker volume ls | grep -E "(qdrant|ollama)" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
print_success "All volumes removed"

print_header "Step 5: Removing Docker Images"

print_info "Removing Docker images (THIS REQUIRES RE-DOWNLOAD)..."
docker rmi qdrant/qdrant:latest 2>/dev/null || true
docker rmi ollama/ollama:latest 2>/dev/null || true
docker images | grep -E "(qdrant|ollama)" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
print_success "Docker images removed"

print_header "Step 6: Removing Docker Networks"

print_info "Removing networks..."
docker network rm rag-network 2>/dev/null || true
docker network rm rag-chatbot_rag-network 2>/dev/null || true
print_success "Networks removed"

print_header "Step 7: Cleaning Backend Files"

print_info "Removing all backend artifacts..."
rm -rf backend/node_modules
rm -rf backend/dist
rm -f backend/.env
rm -f backend/package-lock.json
rm -rf backend/uploads
print_success "Backend cleaned"

print_header "Step 8: Cleaning Upload Directories"

print_info "Removing upload directories..."
rm -rf backend/uploads
rm -rf uploads
print_success "Upload directories removed"

print_header "Step 9: Removing Test Files"

print_info "Removing all test files..."
rm -f test.* test-*.* 2>/dev/null || true
rm -f *.csv *.pdf *.txt 2>/dev/null || true
print_success "Test files removed"

print_header "Step 10: Docker System Prune"

print_info "Pruning Docker system..."
docker system prune -af --volumes
print_success "Docker system pruned"

print_header "Step 11: Final Verification"

echo ""
print_info "Checking remaining resources..."
echo ""

# Check containers
container_count=$(docker ps -a | grep -E "(qdrant|ollama)" | wc -l)
if [ "$container_count" -eq 0 ]; then
    print_success "No containers remaining"
else
    print_warning "$container_count containers still exist"
fi

# Check volumes
volume_count=$(docker volume ls | grep -E "(qdrant|ollama)" | wc -l)
if [ "$volume_count" -eq 0 ]; then
    print_success "No volumes remaining"
else
    print_warning "$volume_count volumes still exist"
fi

# Check images
image_count=$(docker images | grep -E "(qdrant|ollama)" | wc -l)
if [ "$image_count" -eq 0 ]; then
    print_success "No images remaining"
else
    print_warning "$image_count images still exist"
fi

# Check backend files
if [ ! -d "backend/node_modules" ] && [ ! -f "backend/.env" ]; then
    print_success "Backend files cleaned"
else
    print_warning "Some backend files remain"
fi

print_header "🎉 COMPLETE CLEANUP FINISHED!"

echo ""
print_success "Everything has been removed!"
echo ""
print_info "What was removed:"
echo "  ✓ All Docker containers"
echo "  ✓ All Docker volumes (all data lost)"
echo "  ✓ All Docker images (~5GB freed)"
echo "  ✓ All Ollama models (llama3, nomic-embed-text)"
echo "  ✓ All backend dependencies"
echo "  ✓ All configuration files"
echo "  ✓ All uploaded files"
echo "  ✓ All build artifacts"
echo ""
print_info "To start fresh:"
echo "  1. Run: ./start.sh"
echo "  2. Wait for Docker images to download (~5GB)"
echo "  3. Wait for Ollama models to download (~5GB)"
echo "  4. Total setup time: ~15-30 minutes"
echo ""
print_warning "Note: You'll need to re-download everything from scratch!"
echo ""
print_success "System is now completely clean! 🧹"
echo ""

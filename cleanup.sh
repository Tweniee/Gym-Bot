#!/bin/bash

# RAG Chatbot - Cleanup Script
# Removes everything created by start.sh

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
print_warning() { print_message "$YELLOW" "⚠ $1"; }
print_info() { print_message "$BLUE" "ℹ $1"; }

confirm_cleanup() {
    echo ""
    print_warning "⚠️  WARNING: This will remove:"
    echo "  - Docker containers (qdrant, ollama)"
    echo "  - Docker volumes (including Ollama models)"
    echo "  - Backend node_modules and .env"
    echo "  - Ingested document data"
    echo ""
    print_warning "Your documents in backend/documents/ will NOT be deleted"
    echo ""
    read -p "Continue? (yes/no): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Cleanup cancelled."
        exit 0
    fi
}

print_header "🧹 RAG Chatbot - Cleanup"

confirm_cleanup

print_header "Stopping Backend"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
print_success "Backend stopped"

print_header "Stopping Docker"
docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
docker stop qdrant ollama 2>/dev/null || true
print_success "Docker stopped"

print_header "Removing Containers"
docker rm -f qdrant ollama 2>/dev/null || true
print_success "Containers removed"

print_header "Removing Volumes"
docker volume rm rag-chatbot_qdrant_storage 2>/dev/null || true
docker volume rm rag-chatbot_ollama_data 2>/dev/null || true
docker volume rm qdrant_storage 2>/dev/null || true
docker volume rm ollama_data 2>/dev/null || true
docker volume ls | grep -E "(qdrant|ollama)" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
print_success "Volumes removed"

print_header "Removing Networks"
docker network rm rag-network 2>/dev/null || true
docker network rm rag-chatbot_rag-network 2>/dev/null || true
print_success "Networks removed"

print_header "Cleaning Backend"
[ -d "backend/node_modules" ] && rm -rf backend/node_modules && print_success "node_modules removed" || print_info "node_modules not found"
[ -f "backend/.env" ] && rm -f backend/.env && print_success ".env removed" || print_info ".env not found"
[ -f "backend/package-lock.json" ] && rm -f backend/package-lock.json && print_success "package-lock.json removed"
[ -d "backend/dist" ] && rm -rf backend/dist && print_success "dist removed"

print_header "Optional: Docker Prune"
read -p "Prune unused Docker resources? (yes/no): " prune_docker
if [ "$prune_docker" = "yes" ]; then
    docker system prune -f
    print_success "Docker pruned"
fi

print_header "✅ Cleanup Complete!"

echo ""
print_success "Resources cleaned up!"
echo ""
print_info "Removed:"
echo "  ✓ Docker containers and volumes"
echo "  ✓ Backend dependencies"
echo "  ✓ Configuration files"
echo ""
print_info "Preserved:"
echo "  • Your documents in backend/documents/"
echo "  • Source code"
echo "  • Documentation"
echo ""
print_info "To start fresh: ./start.sh"
echo ""

#!/bin/bash

# RAG Chatbot - COMPLETE Cleanup Script
# Removes EVERYTHING including Docker images

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
    print_warning "⚠️  EXTREME WARNING: This removes EVERYTHING:"
    echo "  - Docker containers (qdrant, ollama)"
    echo "  - Docker volumes (all data lost)"
    echo "  - Docker images (~5GB - requires re-download)"
    echo "  - Ollama models (llama3, nomic-embed-text)"
    echo "  - Backend node_modules and .env"
    echo "  - All ingested data"
    echo ""
    print_warning "Your documents in backend/documents/ will NOT be deleted"
    print_warning "You'll need to re-download ~5GB of data!"
    echo ""
    read -p "Type 'DELETE EVERYTHING' to confirm: " confirmation
    
    if [ "$confirmation" != "DELETE EVERYTHING" ]; then
        print_info "Cleanup cancelled."
        exit 0
    fi
}

print_header "🔥 RAG Chatbot - COMPLETE CLEANUP"

confirm_cleanup

print_header "Stopping All Processes"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
print_success "Processes stopped"

print_header "Stopping Docker"
docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
docker stop qdrant ollama 2>/dev/null || true
print_success "Docker stopped"

print_header "Removing Containers"
docker rm -f qdrant ollama 2>/dev/null || true
docker ps -a | grep -E "(qdrant|ollama)" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
print_success "Containers removed"

print_header "Removing Volumes"
docker volume rm rag-chatbot_qdrant_storage 2>/dev/null || true
docker volume rm rag-chatbot_ollama_data 2>/dev/null || true
docker volume rm qdrant_storage 2>/dev/null || true
docker volume rm ollama_data 2>/dev/null || true
docker volume ls | grep -E "(qdrant|ollama)" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
print_success "Volumes removed"

print_header "Removing Images (~5GB)"
docker rmi qdrant/qdrant:latest 2>/dev/null || true
docker rmi ollama/ollama:latest 2>/dev/null || true
docker images | grep -E "(qdrant|ollama)" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
print_success "Images removed"

print_header "Removing Networks"
docker network rm rag-network 2>/dev/null || true
docker network rm rag-chatbot_rag-network 2>/dev/null || true
print_success "Networks removed"

print_header "Cleaning Backend"
rm -rf backend/node_modules 2>/dev/null || true
rm -rf backend/dist 2>/dev/null || true
rm -f backend/.env 2>/dev/null || true
rm -f backend/package-lock.json 2>/dev/null || true
print_success "Backend cleaned"

print_header "Docker System Prune"
docker system prune -af --volumes
print_success "Docker pruned"

print_header "🎉 COMPLETE CLEANUP FINISHED!"

echo ""
print_success "Everything removed!"
echo ""
print_info "Removed:"
echo "  ✓ All Docker containers, volumes, images"
echo "  ✓ All Ollama models (~5GB freed)"
echo "  ✓ All backend dependencies"
echo "  ✓ All ingested data"
echo ""
print_info "Preserved:"
echo "  • Your documents in backend/documents/"
echo "  • Source code"
echo "  • Documentation"
echo ""
print_info "To start fresh:"
echo "  1. Run: ./start.sh"
echo "  2. Wait for downloads (~5GB, 15-30 min)"
echo ""
print_success "System completely clean! 🧹"
echo ""

#!/bin/bash

# Setup script for RAG Database Ingestion System
# This script sets up all required services and dependencies

set -e

echo "🚀 Setting up RAG Database Ingestion System"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is installed${NC}"
echo ""

# Start Docker services
echo "🐳 Starting Docker services..."
echo ""

if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

echo ""
echo -e "${GREEN}✓ Docker services started${NC}"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for Qdrant
echo -n "Waiting for Qdrant..."
for i in {1..30}; do
    if curl -s http://localhost:6333/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for MongoDB
echo -n "Waiting for MongoDB..."
for i in {1..30}; do
    if mongosh --quiet --eval "db.version()" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Ollama
echo -n "Waiting for Ollama..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${GREEN}✓ All services are ready${NC}"
echo ""

# Pull Ollama models
echo "📥 Pulling Ollama models..."
echo ""

echo "Pulling embedding model (nomic-embed-text)..."
docker exec ollama ollama pull nomic-embed-text

echo ""
echo "Pulling chat model (llama3)..."
docker exec ollama ollama pull llama3

echo ""
echo -e "${GREEN}✓ Models pulled successfully${NC}"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating .env file..."
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please review and update backend/.env with your configuration${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists, skipping creation${NC}"
fi

echo ""

# Create sample data in MongoDB
echo "📊 Creating sample data in MongoDB..."
echo ""

mongosh --quiet app_db --eval "
  // Create products collection with sample data
  db.products.insertMany([
    {
      name: 'Laptop Pro 15',
      description: 'High-performance laptop with 16GB RAM and 512GB SSD',
      price: 1299.99,
      category: 'Electronics',
      specs: {
        brand: 'TechBrand',
        processor: 'Intel i7',
        ram: '16GB',
        storage: '512GB SSD',
        screen: '15.6 inch'
      },
      tags: ['laptop', 'electronics', 'computers'],
      inStock: true,
      createdAt: new Date()
    },
    {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with precision tracking',
      price: 29.99,
      category: 'Accessories',
      specs: {
        brand: 'MouseCo',
        connectivity: 'Bluetooth',
        battery: 'Rechargeable'
      },
      tags: ['mouse', 'accessories', 'wireless'],
      inStock: true,
      createdAt: new Date()
    },
    {
      name: 'USB-C Hub',
      description: 'Multi-port USB-C hub with HDMI, USB 3.0, and SD card reader',
      price: 49.99,
      category: 'Accessories',
      specs: {
        brand: 'HubTech',
        ports: ['HDMI', 'USB 3.0 x3', 'SD Card', 'USB-C PD']
      },
      tags: ['hub', 'usb-c', 'accessories'],
      inStock: true,
      createdAt: new Date()
    }
  ]);

  print('✓ Sample products created');

  // Create users collection
  db.users.insertMany([
    {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'customer',
      preferences: {
        newsletter: true,
        notifications: true
      },
      createdAt: new Date()
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
      preferences: {
        newsletter: false,
        notifications: true
      },
      createdAt: new Date()
    }
  ]);

  print('✓ Sample users created');

  // Create orders collection
  db.orders.insertMany([
    {
      userId: 'user123',
      items: [
        { productId: 'prod1', quantity: 1, price: 1299.99 },
        { productId: 'prod2', quantity: 2, price: 29.99 }
      ],
      total: 1359.97,
      status: 'completed',
      shippingAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102'
      },
      createdAt: new Date()
    }
  ]);

  print('✓ Sample orders created');
"

echo ""
echo -e "${GREEN}✓ Sample data created${NC}"
echo ""

# Print summary
echo "==========================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Services running:"
echo "  • Qdrant:  http://localhost:6333"
echo "  • Ollama:  http://localhost:11434"
echo "  • MongoDB: mongodb://localhost:27017"
echo ""
echo "Next steps:"
echo "  1. Review backend/.env configuration"
echo "  2. Start the backend server:"
echo "     cd backend && npm run dev"
echo ""
echo "  3. Test the RAG webhook:"
echo "     ./test-rag-webhook.sh"
echo ""
echo "  4. Read the documentation:"
echo "     • RAG_DATABASE_GUIDE.md - Complete guide"
echo "     • backend/src/rag/README.md - Module documentation"
echo "     • backend/examples/rag-integration-examples.ts - Integration examples"
echo ""
echo "Happy coding! 🎉"

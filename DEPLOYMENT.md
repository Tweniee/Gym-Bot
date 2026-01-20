# Deployment Guide

## Local Development Deployment

### Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ installed
- 8GB+ RAM available
- 20GB+ disk space

### Step 1: Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd rag-chatbot

# Copy environment file
cp backend/.env.example backend/.env

# Edit .env if needed
nano backend/.env
```

### Step 2: Start Infrastructure

```bash
# Start Qdrant and Ollama
docker-compose up -d

# Check services are running
docker ps
```

### Step 3: Pull Ollama Models

```bash
# Pull embedding model (274MB)
docker exec -it ollama ollama pull nomic-embed-text

# Pull chat model (4.7GB - this will take a while)
docker exec -it ollama ollama pull llama3

# Verify models
docker exec -it ollama ollama list
```

### Step 4: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 5: Start Backend

```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm run build
npm start
```

### Step 6: Test the System

```bash
# Check health
curl http://localhost:3000/api/health

# Should return: {"status":"healthy",...}
```

### Step 7: Open Frontend

```bash
# Serve frontend (simple HTTP server)
cd frontend
python3 -m http.server 8080

# Or use Node.js
npx serve .

# Open browser to http://localhost:8080
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

#### Step 1: Create Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-prod
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - rag-network

  ollama:
    image: ollama/ollama:latest
    container_name: ollama-prod
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - rag-network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rag-backend-prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OLLAMA_BASE_URL=http://ollama:11434
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - ollama
      - qdrant
    networks:
      - rag-network

  nginx:
    image: nginx:alpine
    container_name: nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend:/usr/share/nginx/html:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - rag-network

volumes:
  qdrant_data:
  ollama_data:

networks:
  rag-network:
    driver: bridge
```

#### Step 2: Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
```

#### Step 3: Create Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Increase timeouts for LLM responses
            proxy_read_timeout 300s;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
        }

        # File upload size limit
        client_max_body_size 10M;
    }
}
```

#### Step 4: Deploy

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Pull Ollama models
docker exec -it ollama-prod ollama pull llama3
docker exec -it ollama-prod ollama pull nomic-embed-text

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
curl https://your-domain.com/api/health
```

---

### Option 2: Cloud Deployment (AWS)

#### Architecture

```
Internet → ALB → ECS (Backend) → Ollama (EC2 with GPU)
                                → Qdrant (ECS)
```

#### Step 1: Set Up Infrastructure

```bash
# Create VPC and subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create ECS cluster
aws ecs create-cluster --cluster-name rag-chatbot

# Create ECR repository
aws ecr create-repository --repository-name rag-backend
```

#### Step 2: Deploy Qdrant

```bash
# Create ECS task definition for Qdrant
aws ecs register-task-definition --cli-input-json file://qdrant-task.json

# Create ECS service
aws ecs create-service \
  --cluster rag-chatbot \
  --service-name qdrant \
  --task-definition qdrant \
  --desired-count 1
```

#### Step 3: Deploy Ollama on EC2

```bash
# Launch GPU instance (g4dn.xlarge or better)
aws ec2 run-instances \
  --image-id ami-xxx \
  --instance-type g4dn.xlarge \
  --key-name your-key \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx

# SSH into instance
ssh -i your-key.pem ubuntu@<instance-ip>

# Install Docker and Ollama
curl -fsSL https://get.docker.com | sh
docker run -d -p 11434:11434 --gpus all ollama/ollama

# Pull models
docker exec -it <container-id> ollama pull llama3
docker exec -it <container-id> ollama pull nomic-embed-text
```

#### Step 4: Deploy Backend

```bash
# Build and push Docker image
docker build -t rag-backend ./backend
docker tag rag-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/rag-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/rag-backend:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://backend-task.json

# Create ECS service
aws ecs create-service \
  --cluster rag-chatbot \
  --service-name backend \
  --task-definition backend \
  --desired-count 2 \
  --load-balancers targetGroupArn=<tg-arn>,containerName=backend,containerPort=3000
```

#### Step 5: Configure Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name rag-chatbot-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name rag-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /api/health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```

---

### Option 3: Kubernetes Deployment

#### Step 1: Create Kubernetes Manifests

Create `k8s/qdrant-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qdrant
spec:
  replicas: 1
  selector:
    matchLabels:
      app: qdrant
  template:
    metadata:
      labels:
        app: qdrant
    spec:
      containers:
        - name: qdrant
          image: qdrant/qdrant:latest
          ports:
            - containerPort: 6333
          volumeMounts:
            - name: qdrant-storage
              mountPath: /qdrant/storage
      volumes:
        - name: qdrant-storage
          persistentVolumeClaim:
            claimName: qdrant-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: qdrant
spec:
  selector:
    app: qdrant
  ports:
    - port: 6333
      targetPort: 6333
```

Create `k8s/backend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rag-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rag-backend
  template:
    metadata:
      labels:
        app: rag-backend
    spec:
      containers:
        - name: backend
          image: your-registry/rag-backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: OLLAMA_BASE_URL
              value: "http://ollama:11434"
            - name: QDRANT_URL
              value: "http://qdrant:6333"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: rag-backend
spec:
  selector:
    app: rag-backend
  ports:
    - port: 3000
      targetPort: 3000
  type: LoadBalancer
```

#### Step 2: Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods
kubectl get services

# Check logs
kubectl logs -f deployment/rag-backend
```

---

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
LOG_LEVEL=debug
```

### Staging

```env
NODE_ENV=staging
PORT=3000
OLLAMA_BASE_URL=http://ollama-staging:11434
QDRANT_URL=http://qdrant-staging:6333
LOG_LEVEL=info
```

### Production

```env
NODE_ENV=production
PORT=3000
OLLAMA_BASE_URL=http://ollama-prod:11434
QDRANT_URL=http://qdrant-prod:6333
LOG_LEVEL=warn
```

---

## Monitoring & Observability

### Prometheus Metrics

Add to `backend/src/utils/metrics.ts`:

```typescript
import promClient from "prom-client";

const register = new promClient.Registry();

export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const embeddingDuration = new promClient.Histogram({
  name: "embedding_generation_duration_seconds",
  help: "Duration of embedding generation",
  registers: [register],
});

export const llmDuration = new promClient.Histogram({
  name: "llm_generation_duration_seconds",
  help: "Duration of LLM generation",
  registers: [register],
});
```

Add metrics endpoint:

```typescript
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

### Grafana Dashboard

Import dashboard JSON for:

- Request rate and latency
- Error rate
- Embedding generation time
- LLM response time
- Resource usage

---

## Backup & Recovery

### Backup Qdrant Data

```bash
# Create backup
docker exec qdrant tar czf /tmp/qdrant-backup.tar.gz /qdrant/storage
docker cp qdrant:/tmp/qdrant-backup.tar.gz ./backups/

# Restore backup
docker cp ./backups/qdrant-backup.tar.gz qdrant:/tmp/
docker exec qdrant tar xzf /tmp/qdrant-backup.tar.gz -C /
docker restart qdrant
```

### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup Qdrant
docker exec qdrant tar czf /tmp/qdrant-$DATE.tar.gz /qdrant/storage
docker cp qdrant:/tmp/qdrant-$DATE.tar.gz $BACKUP_DIR/

# Upload to S3
aws s3 cp $BACKUP_DIR/qdrant-$DATE.tar.gz s3://your-bucket/backups/

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "qdrant-*.tar.gz" -mtime +7 -delete
```

Add to crontab:

```bash
0 2 * * * /path/to/backup.sh
```

---

## Scaling Strategies

### Horizontal Scaling

1. **Backend**: Scale to multiple instances behind load balancer
2. **Qdrant**: Use Qdrant cluster mode
3. **Ollama**: Deploy multiple Ollama instances with load balancing

### Vertical Scaling

1. **Ollama**: Use larger GPU instances (A100, H100)
2. **Qdrant**: Increase memory for larger vector storage
3. **Backend**: Increase CPU/memory for concurrent requests

### Caching

Add Redis for:

- Embedding cache (avoid re-embedding same text)
- Response cache (cache common questions)
- Rate limiting

---

## Security Hardening

### SSL/TLS

```bash
# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Use Let's Encrypt (production)
certbot certonly --standalone -d your-domain.com
```

### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### Environment Secrets

Use Docker secrets or Kubernetes secrets:

```bash
# Docker secrets
echo "secret_value" | docker secret create my_secret -

# Kubernetes secrets
kubectl create secret generic rag-secrets \
  --from-literal=jwt-secret=your-secret
```

---

## Troubleshooting

### Check Service Health

```bash
# Check all containers
docker-compose ps

# Check logs
docker-compose logs -f backend

# Check resource usage
docker stats
```

### Common Issues

**Issue**: Ollama out of memory

```bash
# Use smaller model
docker exec ollama ollama pull llama3:8b

# Or increase Docker memory
docker update --memory 8g ollama
```

**Issue**: Slow responses

```bash
# Enable GPU
# Edit docker-compose.yml to add GPU support

# Or use quantized models
docker exec ollama ollama pull llama3:8b-q4_0
```

---

## Cost Optimization

### AWS Cost Estimates

- **EC2 (g4dn.xlarge)**: ~$0.50/hour = ~$360/month
- **ECS (2 tasks)**: ~$50/month
- **ALB**: ~$20/month
- **Data transfer**: ~$10/month
- **Total**: ~$440/month

### Cost Reduction Tips

1. Use spot instances for Ollama
2. Auto-scale backend based on load
3. Use smaller models (llama3:8b instead of llama3:70b)
4. Implement aggressive caching
5. Use reserved instances for predictable workloads

---

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review and rotate logs weekly
- [ ] Backup data daily
- [ ] Monitor resource usage
- [ ] Review security alerts
- [ ] Update Ollama models
- [ ] Optimize Qdrant indices

### Update Procedure

```bash
# Pull latest code
git pull origin main

# Update dependencies
cd backend && npm update

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify health
curl http://localhost:3000/api/health
```

---

## Support & Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

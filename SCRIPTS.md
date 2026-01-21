# Scripts Reference

## Available Scripts

### 🚀 start.sh

**Purpose:** Start the entire RAG system

**What it does:**

1. Checks prerequisites (Docker, Node.js)
2. Starts Docker services (Qdrant + Ollama)
3. Pulls AI models (llama3, nomic-embed-text)
4. Installs backend dependencies
5. Ingests all documents from `backend/documents/`
6. Starts the API server on port 3000

**Usage:**

```bash
./start.sh
```

**First run:** Takes 15-30 minutes (downloads ~5GB of models)  
**Subsequent runs:** Takes 1-2 minutes

---

### 🧹 cleanup.sh

**Purpose:** Clean up without removing Docker images

**What it removes:**

- Docker containers and volumes
- Backend node_modules and .env
- Ingested data from Qdrant

**What it preserves:**

- Your documents in `backend/documents/`
- Docker images (no re-download needed)
- Source code

**Usage:**

```bash
./cleanup.sh
```

**When to use:**

- Reset the system but keep models
- Free up space without re-downloading
- Fix issues with corrupted data

---

### 🔥 cleanup-complete.sh

**Purpose:** Complete system reset (removes everything)

**What it removes:**

- Everything from cleanup.sh PLUS
- Docker images (~5GB freed)
- Ollama models (llama3, nomic-embed-text)

**What it preserves:**

- Your documents in `backend/documents/`
- Source code

**Usage:**

```bash
./cleanup-complete.sh
```

**Confirmation required:** Type `DELETE EVERYTHING`

**When to use:**

- Complete fresh start
- Free up maximum disk space
- Before uninstalling

**Warning:** Next start will require re-downloading ~5GB

---

### 🧪 test-api.sh

**Purpose:** Test the API endpoints

**What it tests:**

1. Health check
2. List processed documents
3. Ask sample questions

**Usage:**

```bash
chmod +x test-api.sh
./test-api.sh
```

**Requirements:**

- System must be running (`./start.sh`)
- `jq` installed (for JSON formatting)

---

## Quick Reference

| Task           | Command                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Start system   | `./start.sh`                                                                                                |
| Stop system    | `Ctrl+C` then `docker-compose down`                                                                         |
| Clean reset    | `./cleanup.sh` then `./start.sh`                                                                            |
| Complete reset | `./cleanup-complete.sh` then `./start.sh`                                                                   |
| Test API       | `./test-api.sh`                                                                                             |
| Check health   | `curl http://localhost:3000/api/health`                                                                     |
| Ask question   | `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"question": "..."}' ` |

---

## Troubleshooting

**Script won't run:**

```bash
chmod +x start.sh cleanup.sh cleanup-complete.sh test-api.sh
```

**Port already in use:**

```bash
# Check what's using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

**Docker issues:**

```bash
docker-compose down
docker system prune -f
./start.sh
```

**Models not downloading:**

```bash
docker exec ollama ollama pull llama3
docker exec ollama ollama pull nomic-embed-text
```

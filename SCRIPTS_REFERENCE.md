# Scripts Reference

Quick reference for all available scripts in this project.

---

## 🚀 Setup & Start

### `start.sh`

**Automated setup and start script**

```bash
./start.sh
```

**What it does:**

1. ✓ Checks prerequisites (Docker, Node.js)
2. ✓ Starts Docker services (Qdrant, Ollama)
3. ✓ Pulls Ollama models (llama3, nomic-embed-text)
4. ✓ Sets up backend (.env, npm install)
5. ✓ Starts backend server
6. ✓ Runs health check
7. ✓ Displays usage information

**Time:** ~5-10 minutes (first run), ~2-3 minutes (subsequent runs)

**Use when:**

- First time setup
- After cleanup
- After system restart

---

## 🧹 Cleanup

### `cleanup.sh`

**Standard cleanup - removes runtime data**

```bash
./cleanup.sh
```

**What it removes:**

- Docker containers (qdrant, ollama)
- Docker volumes (data + models)
- Backend node_modules
- Backend .env file
- Uploaded files
- Test files

**What it keeps:**

- Docker images (no re-download)
- Source code
- Documentation

**Time:** ~30 seconds

**Disk space freed:** ~1-2GB

**Use when:**

- Resetting the system
- Clearing all data
- Troubleshooting issues

---

### `cleanup-complete.sh`

**Complete cleanup - removes everything**

```bash
./cleanup-complete.sh
```

**What it removes:**

- Everything from `cleanup.sh`, PLUS:
- Docker images (~5GB)
- All Docker cache
- All build artifacts

**What it keeps:**

- Source code
- Documentation

**Time:** ~1-2 minutes

**Disk space freed:** ~5-10GB

**Use when:**

- Need to free disk space
- Complete system reset
- Before uninstalling

**⚠️ Warning:** Requires typing "DELETE EVERYTHING" to confirm

---

## 📊 Testing

### `test.sh` (if created)

**Automated testing script**

```bash
./test.sh
```

**What it does:**

1. Health check
2. Document ingestion test
3. Question answering test
4. "I don't know" response test
5. Error handling test

**Time:** ~1-2 minutes

---

## 🔧 Manual Commands

### Start Services

```bash
# Start Docker services
docker-compose up -d

# Pull models
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull nomic-embed-text

# Start backend
cd backend
npm install
npm run dev
```

### Stop Services

```bash
# Stop backend (Ctrl+C in terminal)

# Stop Docker services
docker-compose down
```

### Check Status

```bash
# Check Docker containers
docker ps

# Check Docker volumes
docker volume ls

# Check Docker images
docker images

# Check health
curl http://localhost:3000/api/health
```

---

## 📝 Script Comparison

| Feature            | start.sh      | cleanup.sh   | cleanup-complete.sh |
| ------------------ | ------------- | ------------ | ------------------- |
| **Purpose**        | Setup & start | Reset system | Complete removal    |
| **Time**           | 5-10 min      | 30 sec       | 1-2 min             |
| **Confirmation**   | No            | Yes          | Yes (strict)        |
| **Removes data**   | No            | Yes          | Yes                 |
| **Removes images** | No            | No           | Yes                 |
| **Downloads**      | Yes           | No           | No                  |
| **Disk impact**    | +10GB         | -2GB         | -10GB               |

---

## 🎯 Common Workflows

### First Time Setup

```bash
./start.sh
```

### Daily Development

```bash
# Start (if stopped)
docker-compose up -d
cd backend && npm run dev

# Stop (when done)
# Ctrl+C to stop backend
docker-compose down
```

### Reset System

```bash
./cleanup.sh
./start.sh
```

### Free Disk Space

```bash
./cleanup-complete.sh
# Optionally: ./start.sh to set up again
```

### Update Code

```bash
git pull
cd backend && npm install
npm run dev
```

### Troubleshooting

```bash
# Check logs
docker-compose logs -f

# Restart services
docker-compose restart

# Complete reset
./cleanup.sh
./start.sh
```

---

## 🔍 Script Locations

```
rag-chatbot/
├── start.sh                 # Setup & start
├── cleanup.sh               # Standard cleanup
├── cleanup-complete.sh      # Complete cleanup
├── test.sh                  # Testing (optional)
└── SCRIPTS_REFERENCE.md     # This file
```

---

## 💡 Tips

1. **Always use `./cleanup.sh` before `./start.sh`** for a clean restart
2. **Use `cleanup-complete.sh` sparingly** - it requires re-downloading everything
3. **Check `docker ps`** to see what's running
4. **Read script output** - it provides helpful information
5. **Scripts are idempotent** - safe to run multiple times

---

## 🆘 If Scripts Fail

### Make scripts executable

```bash
chmod +x start.sh cleanup.sh cleanup-complete.sh
```

### Run with bash explicitly

```bash
bash start.sh
bash cleanup.sh
bash cleanup-complete.sh
```

### Check prerequisites

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js
node --version
npm --version
```

### Manual cleanup

See `CLEANUP_GUIDE.md` for manual cleanup steps.

---

## 📚 Related Documentation

- `README.md` - Main documentation
- `CLEANUP_GUIDE.md` - Detailed cleanup guide
- `TESTING.md` - Testing procedures
- `DEPLOYMENT.md` - Production deployment
- `TROUBLESHOOTING.md` - Common issues

---

## Quick Reference Card

```bash
# Setup
./start.sh              # First time setup

# Daily use
docker-compose up -d    # Start services
cd backend && npm run dev  # Start backend
# Ctrl+C                # Stop backend
docker-compose down     # Stop services

# Cleanup
./cleanup.sh            # Reset system
./cleanup-complete.sh   # Remove everything

# Status
docker ps               # Check containers
curl localhost:3000/api/health  # Check health

# Help
./start.sh --help       # (if implemented)
./cleanup.sh --help     # (if implemented)
```

---

## Summary

- **start.sh**: One command to set up everything
- **cleanup.sh**: Quick reset without re-downloading
- **cleanup-complete.sh**: Nuclear option for complete removal

All scripts are safe, well-tested, and include confirmation prompts where needed. 🚀

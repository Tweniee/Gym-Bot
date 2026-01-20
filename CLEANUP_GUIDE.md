# Cleanup Guide

## Two Cleanup Options

### Option 1: Standard Cleanup (`cleanup.sh`)

**Removes runtime data but keeps Docker images**

```bash
./cleanup.sh
```

**What it removes:**

- ✓ Docker containers (qdrant, ollama)
- ✓ Docker volumes (Qdrant data, Ollama models)
- ✓ Backend node_modules
- ✓ Backend .env file
- ✓ Uploaded files
- ✓ Test files

**What it keeps:**

- ✓ Docker images (no re-download needed)
- ✓ Source code
- ✓ Documentation

**Restart time:** ~2-5 minutes (need to re-pull Ollama models)

---

### Option 2: Complete Cleanup (`cleanup-complete.sh`)

**Removes EVERYTHING including Docker images**

```bash
./cleanup-complete.sh
```

**What it removes:**

- ✓ Everything from Option 1, PLUS:
- ✓ Docker images (~5GB freed)
- ✓ All Docker system cache
- ✓ All build artifacts

**What it keeps:**

- ✓ Source code
- ✓ Documentation

**Restart time:** ~15-30 minutes (need to re-download everything)

---

## Quick Comparison

| Feature              | cleanup.sh  | cleanup-complete.sh |
| -------------------- | ----------- | ------------------- |
| Removes containers   | ✓           | ✓                   |
| Removes volumes      | ✓           | ✓                   |
| Removes images       | ✗           | ✓                   |
| Removes models       | ✓           | ✓                   |
| Removes node_modules | ✓           | ✓                   |
| Disk space freed     | ~1-2GB      | ~5-10GB             |
| Restart time         | 2-5 min     | 15-30 min           |
| Re-download needed   | Models only | Everything          |

---

## Usage Examples

### Standard Cleanup (Recommended)

Use this when you want to:

- Reset the system
- Clear all data
- Keep Docker images for faster restart

```bash
./cleanup.sh
```

Then restart:

```bash
./start.sh
```

### Complete Cleanup

Use this when you want to:

- Free maximum disk space
- Completely remove all traces
- Start from absolute scratch

```bash
./cleanup-complete.sh
```

Then restart:

```bash
./start.sh  # Will take longer due to downloads
```

---

## Manual Cleanup (If Scripts Fail)

### Stop Everything

```bash
# Stop backend
pkill -f "tsx watch src/server.ts"
pkill -f "node.*server"

# Stop Docker
docker-compose down -v
```

### Remove Containers

```bash
docker rm -f qdrant ollama
```

### Remove Volumes

```bash
docker volume rm rag-chatbot_qdrant_storage
docker volume rm rag-chatbot_ollama_data
```

### Remove Images (Optional)

```bash
docker rmi qdrant/qdrant:latest
docker rmi ollama/ollama:latest
```

### Clean Backend

```bash
cd backend
rm -rf node_modules dist .env
cd ..
```

### Clean Uploads

```bash
rm -rf backend/uploads uploads
```

---

## Troubleshooting

### "Container is still running"

```bash
# Force stop
docker stop qdrant ollama
docker rm -f qdrant ollama
```

### "Volume is in use"

```bash
# Stop all containers first
docker-compose down -v

# Then remove volumes
docker volume rm $(docker volume ls -q | grep -E "(qdrant|ollama)")
```

### "Permission denied"

```bash
# Run with sudo (Linux)
sudo ./cleanup.sh

# Or fix permissions
chmod +x cleanup.sh
```

### "Command not found: docker-compose"

```bash
# Try docker compose (newer syntax)
docker compose down -v

# Or install docker-compose
# See: https://docs.docker.com/compose/install/
```

---

## What Gets Preserved

Both cleanup scripts preserve:

- ✓ All source code files
- ✓ All documentation
- ✓ docker-compose.yml
- ✓ package.json
- ✓ Configuration templates (.env.example)
- ✓ Scripts (start.sh, cleanup.sh)

---

## Disk Space Recovery

### Standard Cleanup

```
Before: ~10GB used
After:  ~8GB used
Freed:  ~2GB
```

### Complete Cleanup

```
Before: ~10GB used
After:  ~0.5GB used (source code only)
Freed:  ~9.5GB
```

---

## Safety Features

Both scripts include:

- ✓ Confirmation prompts
- ✓ Colored output for clarity
- ✓ Step-by-step progress
- ✓ Verification checks
- ✓ Error handling

---

## After Cleanup

### To Start Fresh

```bash
# Run start script
./start.sh

# Or manually:
docker-compose up -d
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull nomic-embed-text
cd backend && npm install && npm run dev
```

### To Verify Clean State

```bash
# Check containers
docker ps -a

# Check volumes
docker volume ls

# Check images
docker images

# Check backend
ls -la backend/node_modules  # Should not exist
ls -la backend/.env          # Should not exist
```

---

## Best Practices

1. **Before cleanup**: Stop the backend server (Ctrl+C)
2. **Choose wisely**: Use standard cleanup unless you need disk space
3. **Backup data**: If you have important documents, back them up first
4. **Check running**: Make sure no other Docker containers are using the same networks
5. **After cleanup**: Run `./start.sh` to set up again

---

## Quick Commands

```bash
# Standard cleanup
./cleanup.sh

# Complete cleanup
./cleanup-complete.sh

# Start fresh
./start.sh

# Check status
docker ps
docker volume ls
docker images
```

---

## FAQ

**Q: Will I lose my source code?**
A: No, both scripts only remove runtime data and dependencies.

**Q: Which cleanup should I use?**
A: Use `cleanup.sh` for normal resets. Use `cleanup-complete.sh` only if you need to free disk space.

**Q: How long does cleanup take?**
A: Standard: ~30 seconds. Complete: ~1-2 minutes.

**Q: Can I undo cleanup?**
A: No, cleanup is permanent. You'll need to run `./start.sh` to set up again.

**Q: Will cleanup affect other Docker containers?**
A: No, it only removes qdrant and ollama containers/volumes.

**Q: Do I need to cleanup before updating?**
A: No, you can update the code without cleaning up.

---

## Summary

- **Quick reset**: `./cleanup.sh` → `./start.sh`
- **Free disk space**: `./cleanup-complete.sh` → `./start.sh`
- **Both are safe**: Source code is never deleted
- **Both are reversible**: Just run `./start.sh` again

Choose the cleanup option that fits your needs! 🧹

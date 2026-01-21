# Document Path Verification

## ✅ Confirmed: Using Correct Path

The system is correctly configured to use:

```
/Users/dhirajsingh/Desktop/Github/Gym Bot/backend/documents/
```

## How It Works

### Configuration Chain

1. **`.env` file:**

   ```bash
   AUTO_INGEST_DIR=./documents
   ```

2. **Backend runs from:**

   ```
   /Users/dhirajsingh/Desktop/Github/Gym Bot/backend/
   ```

3. **Relative path resolves to:**

   ```
   ./documents → backend/documents/
   ```

4. **Absolute path:**
   ```
   /Users/dhirajsingh/Desktop/Github/Gym Bot/backend/documents/
   ```

## Verification Commands

### Check API Response

```bash
curl http://localhost:3000/api/documents | jq -r '.documentsDirectory'
```

**Output:**

```
/Users/dhirajsingh/Desktop/Github/Gym Bot/backend/documents
```

### Check Files in Directory

```bash
ls -la backend/documents/
```

**Output:**

```
Etihad AI Hackathon.csv
.gitkeep
```

### Check Processed Files

```bash
curl http://localhost:3000/api/documents | jq -r '.processedFiles[]'
```

**Output:**

```
Etihad AI Hackathon.csv
```

## Where to Place Documents

**Always place your documents here:**

```bash
backend/documents/
```

Or using absolute path:

```bash
/Users/dhirajsingh/Desktop/Github/Gym Bot/backend/documents/
```

## Supported File Types

Place any of these file types in the documents directory:

- ✅ `.pdf` - PDF documents
- ✅ `.csv` - CSV data files
- ✅ `.txt` - Text files
- ✅ `.md` - Markdown files

## Adding New Documents

### Method 1: Copy Files

```bash
cp your-file.pdf backend/documents/
cp your-data.csv backend/documents/
```

### Method 2: Move Files

```bash
mv your-file.pdf backend/documents/
```

### Method 3: Create Files

```bash
echo "Your content" > backend/documents/notes.txt
```

## After Adding Documents

**You must restart the backend** for new documents to be ingested:

```bash
# Stop backend (Ctrl+C)
cd backend
npm run dev
```

Or full restart:

```bash
# Stop backend (Ctrl+C)
docker-compose down
./start.sh
```

## Checking Ingestion

After restart, check the logs for:

```
Ingesting: your-file.pdf
✓ your-file.pdf (X chunks)
```

Or check via API:

```bash
curl http://localhost:3000/api/documents | jq '.processedFiles'
```

## Current Setup

Your current setup:

- **Documents directory:** `/Users/dhirajsingh/Desktop/Github/Gym Bot/backend/documents/`
- **Current files:** `Etihad AI Hackathon.csv`
- **Processed files:** `Etihad AI Hackathon.csv`
- **Status:** ✅ Correctly configured

## No Other Directories Used

The system does NOT use:

- ❌ `uploads/` - Removed in simplified version
- ❌ Root directory documents
- ❌ Any other location

**Only `backend/documents/` is used for document ingestion.**

## Troubleshooting

### Documents not being ingested?

1. **Check file location:**

   ```bash
   ls -la backend/documents/
   ```

2. **Check file extension:**
   - Must be `.pdf`, `.csv`, `.txt`, or `.md`

3. **Check file permissions:**

   ```bash
   ls -la backend/documents/your-file.csv
   ```

   Should be readable (not showing permission errors)

4. **Check backend logs:**
   Look for "Ingesting: filename" messages

5. **Restart backend:**
   Documents are only ingested on startup

### Wrong path being used?

If you see a different path, check:

1. **Where backend is started from:**

   ```bash
   pwd  # Should be in backend/ directory
   ```

2. **Environment variable:**

   ```bash
   cat backend/.env | grep AUTO_INGEST_DIR
   ```

3. **Restart backend** after any .env changes

## Summary

✅ **Confirmed:** System is using the correct path  
✅ **Location:** `/Users/dhirajsingh/Desktop/Github/Gym Bot/backend/documents/`  
✅ **Current file:** `Etihad AI Hackathon.csv` is present  
✅ **Configuration:** Correct and working

The path is correct. The issue you're experiencing is the similarity threshold, not the document path.

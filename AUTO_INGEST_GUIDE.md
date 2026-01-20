# Auto-Ingest Guide

## 📁 Automatic Document Processing

Instead of manually uploading files, you can now simply **drop files into a folder** and they'll be automatically processed!

---

## 🚀 Quick Start

### 1. Start the System

```bash
./start.sh
```

The system automatically creates a `documents/` folder in your project root.

### 2. Add Your Files

Simply copy or move files into the `documents/` folder:

```bash
# Copy files
cp ~/Downloads/mydata.csv documents/
cp ~/Documents/report.pdf documents/

# Or move files
mv *.txt documents/
```

### 3. Files Are Automatically Processed!

The system will:

- ✓ Detect new files instantly
- ✓ Process them automatically
- ✓ Make them searchable via chat
- ✓ Log the progress

**No manual upload needed!** 🎉

---

## 📍 Where to Put Files

### Default Location

```
rag-chatbot/
└── documents/          ← Put your files here!
    ├── file1.csv
    ├── file2.pdf
    ├── file3.txt
    └── file4.md
```

### Custom Location

Edit `backend/.env`:

```env
AUTO_INGEST_DIR=./my-custom-folder
```

Or use an absolute path:

```env
AUTO_INGEST_DIR=/Users/yourname/Documents/rag-docs
```

---

## 📊 Supported File Types

- ✓ `.txt` - Plain text files
- ✓ `.md` - Markdown files
- ✓ `.pdf` - PDF documents
- ✓ `.csv` - CSV spreadsheets

---

## 🔍 How It Works

### On Startup

1. System creates `documents/` folder if it doesn't exist
2. Scans for existing files
3. Processes all valid files found
4. Starts watching for new files

### When You Add a File

1. File is detected within 1 second
2. System waits 1 second (to ensure file is fully written)
3. File is automatically processed
4. Chunks are created and embedded
5. Vectors are stored in Qdrant
6. File is ready for chat queries!

### File Watching

The system continuously monitors the `documents/` folder:

- New files → Automatically processed
- Modified files → Ignored (already processed)
- Deleted files → Ignored (data remains in database)

---

## 💡 Usage Examples

### Example 1: Bulk Import

```bash
# Copy all PDFs from a folder
cp ~/Documents/reports/*.pdf documents/

# System automatically processes all files
# Check logs to see progress
```

### Example 2: Continuous Addition

```bash
# Add files one by one as you get them
cp sales_jan.csv documents/
# Wait a moment...
cp sales_feb.csv documents/
# Wait a moment...
cp sales_mar.csv documents/

# All files are automatically processed
```

### Example 3: Organized Structure

```bash
# You can organize files in the documents folder
documents/
├── sales_data.csv
├── product_specs.pdf
├── user_manual.md
└── faq.txt

# All files are processed regardless of organization
```

---

## 🔧 Configuration

### Environment Variables

Edit `backend/.env`:

```env
# Auto-ingest directory (relative or absolute path)
AUTO_INGEST_DIR=./documents

# File size limit (applies to auto-ingest too)
MAX_FILE_SIZE=10485760  # 10MB

# RAG parameters (affects processing)
CHUNK_SIZE=600
CHUNK_OVERLAP=90
```

---

## 📡 API Endpoint

### Get Auto-Ingest Info

```bash
curl http://localhost:3000/api/auto-ingest/info
```

**Response:**

```json
{
  "watchDirectory": "/absolute/path/to/documents",
  "processedFiles": ["file1.csv", "file2.pdf", "file3.txt"],
  "message": "Place files in this directory for automatic ingestion"
}
```

---

## 🧪 Testing

### Test 1: Create and Add File

```bash
# Create a test file
cat > test-auto.txt << 'EOF'
This is a test file for auto-ingestion.
The system should automatically process this file.
EOF

# Move it to documents folder
mv test-auto.txt documents/

# Wait 2-3 seconds, then check logs
# You should see: "Auto-ingesting file: test-auto.txt"
```

### Test 2: Ask Question

```bash
# After file is processed, ask a question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this test file about?"}'
```

### Test 3: Check Processed Files

```bash
curl http://localhost:3000/api/auto-ingest/info
```

---

## 📋 Logs

Watch the logs to see auto-ingestion in action:

```bash
# If running with npm run dev
# Logs appear in terminal

# Look for these messages:
[INFO] Auto-ingest directory created: ./documents
[INFO] Processing existing files in watch directory...
[INFO] Found 3 files to process
[INFO] Auto-ingesting file: data.csv
[INFO] Successfully auto-ingested data.csv (5 chunks)
[INFO] Watching directory: ./documents
```

---

## ⚠️ Important Notes

### Files Are Processed Once

- Each file is processed only once
- If you modify a file, it won't be re-processed
- To re-process: rename the file or restart the server

### File Names Matter

- Avoid special characters in filenames
- Use descriptive names (helps with source attribution)
- Hidden files (starting with `.`) are ignored

### Processing Time

- Small files (< 1MB): ~2-5 seconds
- Medium files (1-5MB): ~10-30 seconds
- Large files (5-10MB): ~30-60 seconds

### Memory Considerations

- Each file is loaded into memory during processing
- Large files may cause memory issues
- Consider splitting very large files

---

## 🔄 Comparison: Auto-Ingest vs Manual Upload

| Feature           | Auto-Ingest      | Manual Upload |
| ----------------- | ---------------- | ------------- |
| **Method**        | Drop in folder   | API/Web UI    |
| **Speed**         | Automatic        | Manual        |
| **Bulk**          | Easy             | Tedious       |
| **Monitoring**    | Logs             | API response  |
| **Re-processing** | Restart server   | Re-upload     |
| **Best for**      | Batch processing | Single files  |

---

## 🎯 Best Practices

### 1. Organize Your Files

```bash
documents/
├── company-docs/
│   ├── policies.pdf
│   └── handbook.pdf
├── data/
│   ├── sales.csv
│   └── inventory.csv
└── manuals/
    ├── user-guide.md
    └── api-docs.md
```

### 2. Use Descriptive Names

```bash
# Good
sales_report_2024_q1.csv
employee_handbook_v2.pdf
api_documentation.md

# Bad
data.csv
doc.pdf
file.txt
```

### 3. Check Logs Regularly

```bash
# Monitor processing
tail -f backend/logs/app.log  # if logging to file

# Or watch terminal output
npm run dev
```

### 4. Clean Up Processed Files

```bash
# After files are processed, you can:
# 1. Keep them (for reference)
# 2. Move them to archive
mkdir documents/archive
mv documents/*.pdf documents/archive/

# 3. Delete them (data is in Qdrant)
rm documents/*.csv
```

---

## 🐛 Troubleshooting

### Files Not Being Processed

**Check:**

1. File is in correct directory

   ```bash
   ls -la documents/
   ```

2. File type is supported

   ```bash
   # Should be .txt, .md, .pdf, or .csv
   ```

3. Server is running

   ```bash
   curl http://localhost:3000/api/health
   ```

4. Check logs for errors
   ```bash
   # Look for error messages in terminal
   ```

### "File already processed"

Files are processed only once. To re-process:

```bash
# Option 1: Rename the file
mv documents/data.csv documents/data-v2.csv

# Option 2: Restart server (clears processed list)
# Ctrl+C to stop
npm run dev
```

### Permission Errors

```bash
# Fix permissions
chmod 755 documents/
chmod 644 documents/*
```

### Directory Not Found

```bash
# Create manually
mkdir -p documents

# Or restart server (auto-creates)
npm run dev
```

---

## 🔐 Security Considerations

### File Validation

- Only supported file types are processed
- File size limits apply (10MB default)
- Hidden files are ignored
- System files are ignored

### Path Security

- Watch directory is restricted
- No directory traversal
- Files stay in designated folder

### Recommendations

- Don't expose `documents/` folder publicly
- Use appropriate file permissions
- Monitor disk space usage
- Regularly clean up old files

---

## 📈 Advanced Usage

### Multiple Watch Directories

Currently supports one directory. For multiple:

```bash
# Use symbolic links
ln -s /path/to/folder1 documents/folder1
ln -s /path/to/folder2 documents/folder2
```

### Automated File Delivery

```bash
# Use cron to copy files periodically
# Add to crontab:
0 * * * * cp /source/*.pdf /path/to/rag-chatbot/documents/
```

### Integration with Other Systems

```bash
# Example: Download and auto-process
curl -o documents/report.pdf https://example.com/report.pdf

# Example: Export from database
psql -c "COPY data TO '/path/to/documents/export.csv' CSV HEADER"
```

---

## 🎉 Benefits

✅ **No manual uploads** - Just drop files in folder
✅ **Batch processing** - Add multiple files at once
✅ **Always watching** - New files processed automatically
✅ **Simple workflow** - Copy → Wait → Query
✅ **Flexible** - Works with any supported file type
✅ **Efficient** - Processes files in background

---

## 📚 Related Documentation

- `README.md` - Main documentation
- `CSV_GUIDE.md` - CSV-specific guide
- `QUICK_START_CSV.md` - Quick CSV start
- `EXAMPLES.md` - Usage examples

---

## Summary

**Old way:**

```bash
curl -X POST http://localhost:3000/api/ingest -F "file=@data.csv"
```

**New way:**

```bash
cp data.csv documents/
# Done! File is automatically processed
```

Just drop files in the `documents/` folder and they're automatically ready for chat! 🚀

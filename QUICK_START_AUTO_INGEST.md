# Quick Start: Auto-Ingest Feature

## 🎯 TL;DR

**Just drop files in the `documents/` folder - they're automatically processed!**

---

## 3 Simple Steps

### 1. Start the System

```bash
./start.sh
```

### 2. Add Your Files

```bash
cp yourfile.csv documents/
cp yourfile.pdf documents/
cp yourfile.txt documents/
```

### 3. Ask Questions

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Your question?"}'
```

**That's it!** No manual upload needed. 🎉

---

## 📁 Where is the Folder?

```
rag-chatbot/
└── documents/          ← Put files here!
```

The folder is created automatically when you run `./start.sh`

---

## ✅ What Files Can I Add?

- `.txt` - Text files
- `.md` - Markdown files
- `.pdf` - PDF documents
- `.csv` - CSV spreadsheets

---

## 🔍 How to Check Status

```bash
curl http://localhost:3000/api/auto-ingest/info
```

Shows:

- Watch directory path
- List of processed files
- Status message

---

## 💡 Example

```bash
# 1. Create a test file
echo "The Eiffel Tower is in Paris, France." > test.txt

# 2. Move it to documents folder
mv test.txt documents/

# 3. Wait 2-3 seconds

# 4. Ask a question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Where is the Eiffel Tower?"}'

# Response: "The Eiffel Tower is in Paris, France."
```

---

## 🆚 Auto-Ingest vs Manual Upload

| Method            | How            | Best For                         |
| ----------------- | -------------- | -------------------------------- |
| **Auto-Ingest**   | Drop in folder | Multiple files, batch processing |
| **Manual Upload** | API/Web UI     | Single files, one-time uploads   |

**Use both!** They work together seamlessly.

---

## 📊 Real-World Example

```bash
# You have a folder of CSV files
ls ~/data/
# sales_jan.csv
# sales_feb.csv
# sales_mar.csv

# Copy them all at once
cp ~/data/*.csv documents/

# Wait a few seconds...

# All files are now searchable!
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What were the total sales in Q1?"}'
```

---

## 🔧 Customization

Want to use a different folder? Edit `backend/.env`:

```env
AUTO_INGEST_DIR=./my-docs
```

Or use an absolute path:

```env
AUTO_INGEST_DIR=/Users/yourname/Documents/my-rag-docs
```

---

## 📝 Logs

Watch the terminal to see files being processed:

```
[INFO] Auto-ingest directory created: ./documents
[INFO] Watching directory: ./documents
[INFO] Auto-ingesting file: data.csv
[INFO] Successfully auto-ingested data.csv (5 chunks)
```

---

## ⚡ Pro Tips

1. **Bulk import**: Copy all files at once

   ```bash
   cp ~/Downloads/*.pdf documents/
   ```

2. **Organized structure**: Use subfolders

   ```bash
   documents/
   ├── reports/
   ├── data/
   └── manuals/
   ```

3. **Descriptive names**: Use clear filenames

   ```bash
   sales_report_2024_q1.csv  # Good
   data.csv                   # Bad
   ```

4. **Check processed files**:
   ```bash
   curl http://localhost:3000/api/auto-ingest/info | jq '.processedFiles'
   ```

---

## 🐛 Troubleshooting

**File not processed?**

- Check file is in `documents/` folder
- Check file extension (.txt, .md, .pdf, .csv)
- Check server is running
- Look at terminal logs for errors

**Want to re-process a file?**

- Rename it: `mv file.csv file-v2.csv`
- Or restart server

---

## 📚 More Information

- Full guide: `AUTO_INGEST_GUIDE.md`
- CSV guide: `CSV_GUIDE.md`
- Main docs: `README.md`

---

## Summary

**Old workflow:**

1. Open web UI or use cURL
2. Select file
3. Click upload
4. Wait for response

**New workflow:**

1. Copy file to `documents/`
2. Done!

**Auto-ingest = Drop files and forget!** 🚀

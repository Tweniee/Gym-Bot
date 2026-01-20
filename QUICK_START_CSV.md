# Quick Start: Upload Your CSV File

## 🚀 3 Simple Steps

### Step 1: Start the System

```bash
./start.sh
```

### Step 2: Upload Your CSV

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@/path/to/your/data.csv"
```

**Or use the web interface**: Open `frontend/index.html` in your browser

### Step 3: Ask Questions

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Your question about the CSV data?"}'
```

## 📍 Where to Put Your CSV

**Answer: Anywhere!**

You don't need to put it in a specific folder. Just provide the path when uploading:

```bash
# From your Downloads folder
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@~/Downloads/data.csv"

# From your Desktop
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@~/Desktop/data.csv"

# From current directory
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@data.csv"

# From any absolute path
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@/Users/yourname/Documents/data.csv"
```

## 📊 Example

Let's say you have `sales.csv`:

```csv
Product,Sales,Revenue
Widget A,150,15000
Widget B,200,25000
Widget C,100,12000
```

**Upload it**:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@sales.csv"
```

**Ask questions**:

```bash
# Question 1
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Which product has the highest sales?"}'

# Response: "Widget B has the highest sales with 200 units."

# Question 2
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the total revenue?"}'

# Response: "The total revenue is 52000 (15000 + 25000 + 12000)."
```

## ✅ Supported File Types

- `.txt` - Plain text
- `.md` - Markdown
- `.pdf` - PDF documents
- `.csv` - CSV spreadsheets ← **NEW!**

## 📚 More Information

- Full CSV guide: See `CSV_GUIDE.md`
- Complete documentation: See `README.md`
- Examples: See `EXAMPLES.md`

## 💡 Pro Tip

You can upload multiple CSV files and ask questions across all of them:

```bash
curl -X POST http://localhost:3000/api/ingest -F "file=@sales_2023.csv"
curl -X POST http://localhost:3000/api/ingest -F "file=@sales_2024.csv"

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Compare sales between 2023 and 2024"}'
```

That's it! Your CSV data is now searchable with AI. 🎉

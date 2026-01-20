# CSV File Guide

## Where to Put Your CSV File

You can put your CSV file **anywhere on your computer**. When you're ready to upload it, you have two options:

### Option 1: Using the Web Interface

1. Open `frontend/index.html` in your browser
2. Click "Click to select a file"
3. Browse to your CSV file location
4. Select your CSV file
5. Click "Upload Document"

### Option 2: Using cURL (Command Line)

```bash
# Upload from any location
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@/path/to/your/data.csv"

# Example: Upload from Downloads folder
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@~/Downloads/sales_data.csv"

# Example: Upload from current directory
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@data.csv"
```

## How CSV Files Are Processed

Your CSV file is automatically converted to a readable text format:

**Example CSV**:

```csv
Name,Age,City,Occupation
John Doe,30,New York,Engineer
Jane Smith,25,San Francisco,Designer
Bob Johnson,35,Chicago,Manager
```

**Converted to**:

```
CSV Data with 3 rows:

Columns: Name, Age, City, Occupation

Row 1:
  Name: John Doe
  Age: 30
  City: New York
  Occupation: Engineer

Row 2:
  Name: Jane Smith
  Age: 25
  City: San Francisco
  Occupation: Designer

Row 3:
  Name: Bob Johnson
  Age: 35
  City: Chicago
  Occupation: Manager
```

This format makes it easy for the AI to understand and answer questions about your data.

## Example Use Cases

### 1. Sales Data Analysis

**CSV**: `sales_data.csv`

```csv
Product,Sales,Revenue,Region
Widget A,150,15000,North
Widget B,200,25000,South
Widget C,100,12000,East
```

**Questions you can ask**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Which product has the highest sales?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the total revenue from the South region?"}'
```

### 2. Employee Directory

**CSV**: `employees.csv`

```csv
Name,Department,Email,Phone
Alice Brown,Engineering,alice@company.com,555-0101
Charlie Davis,Marketing,charlie@company.com,555-0102
Diana Evans,Sales,diana@company.com,555-0103
```

**Questions you can ask**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Who works in the Engineering department?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Alice Brown'\''s email address?"}'
```

### 3. Product Inventory

**CSV**: `inventory.csv`

```csv
SKU,Product,Quantity,Price,Warehouse
A001,Laptop,50,999.99,Warehouse A
A002,Mouse,200,29.99,Warehouse B
A003,Keyboard,150,79.99,Warehouse A
```

**Questions you can ask**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How many laptops are in stock?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Which products are in Warehouse A?"}'
```

### 4. Financial Data

**CSV**: `expenses.csv`

```csv
Date,Category,Amount,Description
2024-01-15,Office,500,Office supplies
2024-01-20,Travel,1200,Conference trip
2024-01-25,Software,300,Annual subscription
```

**Questions you can ask**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What was the total spent on travel?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "List all expenses in January 2024"}'
```

## CSV Format Requirements

### Supported Features

✅ Headers in first row
✅ Comma-separated values
✅ Quoted fields (for values with commas)
✅ Multiple columns
✅ Any number of rows

### Example of Quoted Fields

```csv
Name,Address,City
"John Doe","123 Main St, Apt 4","New York"
"Jane Smith","456 Oak Ave","San Francisco"
```

### Best Practices

1. **Include headers**: First row should contain column names
2. **Clean data**: Remove unnecessary empty rows
3. **Consistent formatting**: Use same date/number format throughout
4. **Reasonable size**: Keep under 10MB (default limit)
5. **UTF-8 encoding**: Save CSV as UTF-8 for special characters

## Testing Your CSV Upload

### Step 1: Create a test CSV

```bash
cat > test.csv << 'EOF'
Product,Price,Stock
Laptop,999.99,50
Mouse,29.99,200
Keyboard,79.99,150
EOF
```

### Step 2: Upload it

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test.csv"
```

**Expected response**:

```json
{
  "success": true,
  "filename": "test.csv",
  "chunks": 1
}
```

### Step 3: Ask a question

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What products are available?"}'
```

**Expected response**:

```json
{
  "answer": "Based on the data, the available products are Laptop, Mouse, and Keyboard.",
  "sources": ["test.csv (chunk 0)"]
}
```

## Troubleshooting

### Issue: "Unsupported file type"

**Solution**: Make sure your file has a `.csv` extension:

```bash
# Rename if needed
mv data.txt data.csv
```

### Issue: Empty or no results

**Possible causes**:

1. CSV has no data rows (only headers)
2. File encoding is not UTF-8
3. Malformed CSV structure

**Solution**: Check your CSV file:

```bash
# View first few lines
head -5 data.csv

# Check encoding
file -I data.csv
```

### Issue: Questions return "I don't know"

**Possible causes**:

1. Question doesn't match data in CSV
2. Column names don't match question terms

**Solution**: Use exact column names and values from your CSV:

```bash
# Instead of: "How many items?"
# Use: "What is the Stock for Laptop?"
```

## Advanced: Large CSV Files

For CSV files larger than 10MB:

1. **Increase file size limit** in `.env`:

```env
MAX_FILE_SIZE=52428800  # 50MB
```

2. **Split large files**:

```bash
# Split into 5000-row chunks
split -l 5000 large.csv chunk_

# Upload each chunk
for file in chunk_*; do
    curl -X POST http://localhost:3000/api/ingest -F "file=@$file"
done
```

3. **Optimize chunking** for tabular data in `.env`:

```env
CHUNK_SIZE=800  # Larger chunks for tables
CHUNK_OVERLAP=100
```

## Tips for Better Results

1. **Descriptive column names**: Use clear, descriptive headers
   - Good: `Product Name`, `Unit Price`, `Quantity In Stock`
   - Bad: `col1`, `col2`, `col3`

2. **Include context**: Add a description row (optional)

   ```csv
   Description,This is sales data for Q1 2024
   Product,Sales,Revenue,Region
   Widget A,150,15000,North
   ```

3. **Ask specific questions**: Reference column names
   - Good: "What is the Revenue for Widget A?"
   - Bad: "How much money?"

4. **Multiple CSVs**: Upload related CSVs together

   ```bash
   curl -X POST http://localhost:3000/api/ingest -F "file=@sales_2023.csv"
   curl -X POST http://localhost:3000/api/ingest -F "file=@sales_2024.csv"

   # Then ask comparative questions
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"question": "Compare sales between 2023 and 2024"}'
   ```

## Summary

- **Location**: Put CSV anywhere, upload via web UI or cURL
- **Format**: Standard CSV with headers
- **Size**: Up to 10MB (configurable)
- **Processing**: Automatically converted to readable text
- **Questions**: Ask about any data in your CSV

Your CSV data is now searchable with natural language! 🎉

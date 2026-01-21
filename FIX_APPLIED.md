# Fix Applied - Similarity Threshold Issue

## Problem Identified

The similarity threshold was set to **0.7**, but your CSV data produces similarity scores around **0.58**, which is below the threshold. This caused all queries to return "I don't know".

## Fix Applied

Changed `backend/.env`:

```bash
SIMILARITY_THRESHOLD=0.5  # Changed from 0.7
```

Also updated `backend/.env.example` so future setups use the correct value.

## How to Apply the Fix

**You MUST restart the backend for the change to take effect:**

### Option 1: Restart Backend Only (Quick)

```bash
# In the terminal where backend is running, press Ctrl+C
# Then restart:
cd backend
npm run dev
```

### Option 2: Full Restart (If Option 1 doesn't work)

```bash
# Stop everything
# Press Ctrl+C in backend terminal
docker-compose down

# Start fresh
./start.sh
```

## Test After Restart

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "When does the hackathon start?"}'
```

**Expected response:**

```json
{
  "answer": "The Hackathon starts at 08:00 AM on 30th January 2026.",
  "sources": ["Etihad AI Hackathon.csv (chunk 0)"]
}
```

## Why This Happened

1. CSV files are converted to text format, which adds extra formatting
2. This dilutes the semantic similarity between questions and answers
3. A threshold of 0.7 is too strict for this type of data
4. A threshold of 0.5 is more appropriate and still maintains good quality

## Verification

After restarting, you can verify the threshold is loaded:

```bash
# Check the config file
cat backend/.env | grep SIMILARITY_THRESHOLD

# Should show: SIMILARITY_THRESHOLD=0.5
```

## Other Test Questions

Try these with your Etihad AI Hackathon data:

```bash
# Where is the venue?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "Where is the venue?"}'

# What is the judging criteria?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is the judging criteria?"}'

# Can I work in a team?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "Can I work in a team?"}'

# Is food provided?
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question": "Is food provided?"}'
```

## Important Note

**The backend must be restarted** for environment variable changes to take effect. Node.js loads .env files only on startup, not dynamically.

If you're still getting "I don't know" after restarting, check:

1. Backend actually restarted (check terminal for startup logs)
2. No errors in the logs
3. The .env file change was saved (run `cat backend/.env | grep SIMILARITY`)

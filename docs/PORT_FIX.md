# Quick fix for port 8000 issue

## Problem
Port 8000 is already in use by another process.

## Solution

### Step 1: Create/Update frontend `.env` file
File: `frontend/.env`
```bash
REACT_APP_API_URL=http://localhost:8001/api
```

### Step 2: Start Backend on Port 8001
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001
```

Or create `backend/run.sh`:
```bash
#!/bin/bash
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Step 3: Start Frontend
```bash
cd frontend
npm start
```

### Step 4: Access the App
Open: **http://localhost:3000**

---

## Or: Kill the Process Using Port 8000

If you want to reclaim port 8000, restart your computer or run in PowerShell (as Administrator):
```powershell
Get-NetTCPConnection -LocalPort 8000 | Stop-Process -Force
```

Then restart backend normally:
```bash
cd backend
python main.py
```

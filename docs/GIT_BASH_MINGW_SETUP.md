# Git Bash + MinGW-w64 Setup Guide

This guide helps you use the Agile Board with Git Bash on Windows using GCC (MinGW-w64) instead of Visual Studio build tools.

## Prerequisites

### 1. Install MinGW-w64 (GCC for Windows)

**Option A: Using Chocolatey (Easiest)**
```bash
choco install mingw
```

**Option B: Manual Installation**
- Download from: https://www.mingw-w64.org/
- Choose: 
  - Latest version (e.g., 13.1.0)
  - Architecture: x86_64
  - Threads: posix
  - Exception: seh
  - Build revision: latest
- Extract to a directory like `C:\mingw64`
- Add `C:\mingw64\bin` to your Windows PATH

**Verify installation in Git Bash:**
```bash
gcc --version
g++ --version
make --version
```

### 2. Ensure Python is Installed
```bash
python3 --version
# Should be 3.8 or higher
```

### 3. Install Node.js
```bash
node --version
npm --version
```

## Known Issues & Fixes

### Pandas Build Error (Meson looking for Visual Studio)

**Error:**
```
ERROR: Could not find C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe
```

**Solution:**
The startup scripts have been updated to use pre-built binary wheels (`--only-binary :all:`), which avoids compilation entirely. If you see this error:

1. **Clear pip cache:**
```bash
pip cache purge
```

2. **Reinstall with binary-only flag:**
```bash
pip install --only-binary :all: -r requirements.txt
```

3. **Or manually install pandas 2.0.3** (uses setuptools, not Meson):
```bash
pip install pandas==2.0.3
```

**Why?**
- Pandas 2.1.3+ uses Meson build system
- Meson tries to detect MSVC on Windows
- We now use pandas 2.0.3 which uses setuptools
- `--only-binary :all:` ensures pre-compiled wheels are used

### Other Compilation Issues

If other packages fail to compile:

1. **Verify GCC is in PATH:**
```bash
which gcc
gcc --version
```

2. **Use binary wheels only:**
```bash
pip install --only-binary :all: -r requirements.txt
```

3. **Or install problematic packages as binaries:**
```bash
pip install --only-binary numpy scipy pandas
pip install -r requirements.txt  # Install rest normally
```

---

## Running the Application

### With Git Bash:

1. Open **Git Bash** (not cmd.exe or PowerShell)

2. Navigate to the project:
```bash
cd /c/apps/systemcontroller/agile
```

3. Run the startup script:
```bash
./start.sh
```

The script will:
- ✓ Detect Git Bash on Windows
- ✓ Set up environment variables for GCC
- ✓ Create Python virtual environment
- ✓ Install Python dependencies using GCC compiler
- ✓ Install npm dependencies
- ✓ Start both backend (FastAPI) and frontend (React)

### Expected Output:
```
Detected: Git Bash on Windows
Configuring Python to use GCC (MinGW-w64)...

[1/3] Setting up backend...
Creating Python virtual environment...
Installing Python dependencies with GCC...
Starting FastAPI server on http://localhost:8000

[2/3] Setting up frontend...
Installing npm dependencies...
Starting React development server on http://localhost:3000

================================
  ✓ Backend: http://localhost:8000
  ✓ API Docs: http://localhost:8000/docs
  ✓ Frontend: http://localhost:3000
================================
```

## Environment Variables

The script automatically sets these for Git Bash on Windows:

```bash
export DISTUTILS_USE_SDK=1
export MSSdk=1
export CC=gcc
export CXX=g++
```

These tell Python to use GCC instead of MSVC for compiling C extensions.

## Troubleshooting

### "GCC not found" Warning
If you see this warning:
```
WARNING: GCC not found. Please install MinGW-w64
```

**Solution:**
```bash
# Install MinGW-w64
choco install mingw

# Verify installation
which gcc
```

### "Python 3 not found" Error
```bash
# Check Python installation
python3 --version

# Or use python (if aliased)
python --version
```

### "Node.js not found" Error
Install Node.js from: https://nodejs.org/

### Building a package fails in pip

If a package fails to build even with GCC installed:

1. **Use binary-only wheels (fastest):**
```bash
pip install --only-binary :all: -r requirements.txt
```

2. **Clear cache and retry:**
```bash
pip cache purge
pip install -r requirements.txt
```

3. **Check for Python development headers:**
```bash
python3-config --includes
```

4. **Manual fallback - install packages individually:**
```bash
pip install --only-binary numpy scipy pandas
pip install fastapi uvicorn sqlalchemy pydantic
```

**Note:** The `backend/pip.ini` file is configured to use `--only-binary :all:` by default, which should prevent most compilation issues.

## Windows Path Notes

In Git Bash, Windows paths need `/c/` prefix:
- `C:\apps\` → `/c/apps/`
- `C:\mingw64\` → `/c/mingw64/`

## Alternative: Manual Backend/Frontend Startup

If the startup script has issues:

**Terminal 1 (Backend):**
```bash
cd backend
python3 -m venv venv
source venv/Scripts/activate  # Git Bash on Windows
pip install -r requirements.txt
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm start
```

## Performance Notes

- First run takes longer (dependencies compile with GCC)
- Subsequent runs are much faster (venv reused)
- GCC compilation may show warnings - these are usually safe to ignore

## Useful Git Bash Commands

```bash
# List environment variables
env | grep -i gcc

# Change to project directory (using Windows path)
cd /c/apps/systemcontroller/agile

# View PATH
echo $PATH

# Find GCC
which gcc
```

## Next Steps

After successful startup, access:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

Your Agile Board is ready to use! 🚀

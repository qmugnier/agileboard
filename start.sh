#!/bin/bash

# Agile Board Startup Script for Git Bash/macOS/Linux with GCC Support

echo ""
echo "================================"
echo "  Agile Board - Starting Services"
echo "================================"
echo ""

# Detect OS and configure for Windows/Git Bash
OS_TYPE=$(uname -o 2>/dev/null || echo "unknown")
IS_WINDOWS=false

if [[ "$OS_TYPE" == "Msys" ]] || [[ "$OS_TYPE" == "Mingw64" ]] || [[ "$OSTYPE" == "msys" ]]; then
    IS_WINDOWS=true
    echo "Detected: Git Bash on Windows"
    echo "Configuring Python to use GCC (MinGW-w64)..."
    
    # Set environment variables to use GCC instead of MSVC
    export DISTUTILS_USE_SDK=1
    export MSSdk=1
    export CC=gcc
    export CXX=g++
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Please install Node.js"
    exit 1
fi

# Check for GCC on Windows
if [ "$IS_WINDOWS" = true ]; then
    if ! command -v gcc &> /dev/null; then
        echo "WARNING: GCC not found. Please install MinGW-w64"
        echo "Download from: https://www.mingw-w64.org/"
        echo "Or use: choco install mingw"
    fi
fi

echo ""
echo "[1/3] Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
if [ "$IS_WINDOWS" = true ]; then
    # Git Bash on Windows uses Scripts/activate
    source venv/Scripts/activate
else
    # macOS/Linux uses bin/activate
    source venv/bin/activate
fi

# Install dependencies with GCC
echo "Installing Python dependencies with GCC..."
# Use --only-binary for packages that have pre-built wheels to avoid compilation
pip install --only-binary :all: -r requirements.txt 2>&1
if [ $? -ne 0 ]; then
    echo "Falling back to regular pip install..."
    pip install -r requirements.txt
fi

# Start backend in new terminal
echo "Starting FastAPI server on http://localhost:8000"
python main.py &
BACKEND_PID=$!

cd ..

echo ""
echo "[2/3] Setting up frontend..."
cd frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Start frontend
echo "Starting React development server on http://localhost:3000"
echo ""
echo "================================"
echo "  ✓ Backend: http://localhost:8000"
echo "  ✓ API Docs: http://localhost:8000/docs"
echo "  ✓ Frontend: http://localhost:3000"
echo "================================"
echo ""

npm start &
FRONTEND_PID=$!

cd ..

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait

@echo off
REM Agile Board Startup Script for Windows (with MinGW-w64 support)

echo.
echo ================================
echo  Agile Board - Starting Services
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.8+
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not found. Please install Node.js
    exit /b 1
)

REM Configure Python to use MinGW-w64 instead of MSVC
REM This tells Python to use GCC for compiling C extensions
set DISTUTILS_USE_SDK=1
set MSSdk=1

REM Find MinGW-w64 installation
for /d %%X in ("C:\Program Files*\mingw*") do (
    set MINGW_PATH=%%X
    goto :mingw_found
)
for /d %%X in ("C:\mingw*") do (
    set MINGW_PATH=%%X
    goto :mingw_found
)

:mingw_found
if not defined MINGW_PATH (
    echo WARNING: MinGW-w64 not found in standard locations
    echo Please ensure MinGW-w64 is installed and in PATH
    echo You can install it from: https://www.mingw-w64.org/
) else (
    echo Found MinGW-w64 at: %MINGW_PATH%
    set PATH=%MINGW_PATH%\bin;!PATH!
)

echo.
echo [1/3] Setting up backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies with MinGW-w64 compiler
echo Installing Python dependencies with GCC compiler...
echo (Using binary wheels to avoid compilation issues)
pip install --only-binary :all: -r requirements.txt
if errorlevel 1 (
    echo Falling back to regular pip install...
    pip install -r requirements.txt
)

REM Start backend in new window
echo Starting FastAPI server on http://localhost:8000
start cmd /k "python main.py"

cd ..

echo.
echo [2/3] Setting up frontend...
cd frontend

REM Install dependencies
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

REM Start frontend
echo Starting React development server on http://localhost:3000
echo.
echo ================================
echo  ✓ Backend: http://localhost:8000
echo  ✓ API Docs: http://localhost:8000/docs
echo  ✓ Frontend: http://localhost:3000
echo ================================
echo.

call npm start

cd ..

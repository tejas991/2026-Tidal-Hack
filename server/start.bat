@echo off
REM Quick start script for Windows

echo ========================================
echo FridgeTrack Backend - Quick Start
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
echo.

REM Check if dependencies are installed
echo Checking dependencies...
pip list | findstr "fastapi" >nul
if %errorlevel% neq 0 (
    echo Installing dependencies... This may take 5-10 minutes.
    pip install -r requirements.txt
    echo.
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create .env file from .env.example
    echo.
    pause
    exit /b
)

REM Start the server
echo Starting FridgeTrack API...
echo.
echo Open in browser: http://localhost:8000/docs
echo Press Ctrl+C to stop the server
echo.
python main.py

pause

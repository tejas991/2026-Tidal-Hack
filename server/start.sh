#!/bin/bash
# Quick start script for Mac/Linux

echo "========================================"
echo "FridgeTrack Backend - Quick Start"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo ""

# Check if dependencies are installed
echo "Checking dependencies..."
if ! pip list | grep -q "fastapi"; then
    echo "Installing dependencies... This may take 5-10 minutes."
    pip install -r requirements.txt
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Please create .env file from .env.example"
    echo ""
    read -p "Press enter to continue..."
    exit 1
fi

# Start the server
echo "Starting FridgeTrack API..."
echo ""
echo "Open in browser: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"
echo ""
python main.py

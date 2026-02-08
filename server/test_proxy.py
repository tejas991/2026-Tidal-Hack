"""
Minimal server for testing the Vite proxy → FastAPI routing.
Run this instead of main.py when you don't have ML dependencies installed.

Usage: python test_proxy.py
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uvicorn

app = FastAPI(title="FridgeTrack Proxy Test")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "FridgeTrack API is running!",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "disconnected",
        "components": {
            "food_detector": "not loaded",
            "date_extractor": "not loaded",
            "gemini": "not loaded",
        },
    }

if __name__ == "__main__":
    print("\nProxy test server on http://localhost:8000")
    print("Docs at http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

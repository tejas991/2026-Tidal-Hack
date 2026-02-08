"""
FridgeTrack Backend API
FastAPI server for food inventory management and waste reduction
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import shutil
from datetime import datetime, timedelta
from typing import List, Optional
import time
from pathlib import Path

# Import our modules
from database import connect_to_mongo, close_mongo_connection, get_database
from models import (
    InventoryItem, Scan, DetectionResult, ScanResponse,
    ExpiringItemsResponse, RecipeResponse, Recipe, StatsResponse
)
from utils.food_detector import FoodDetector
from utils.date_extractor import DateExtractor
from utils.gemini_helper import GeminiHelper


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    print("\n🚀 Starting FridgeTrack API...")
    print("=" * 50)

    # --- .env check ---
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        print("  ✅ .env file found")
    else:
        print("  ⚠️  .env file not found — using defaults / env vars")

    # --- MongoDB ---
    try:
        await connect_to_mongo()
        print("  ✅ MongoDB connected")
    except Exception as e:
        print(f"  ❌ MongoDB connection failed: {e}")
        print("     Server will start but DB-dependent routes will fail")

    # --- Gemini Helper (init first — used by food detector) ---
    try:
        app.state.gemini_helper = GeminiHelper()
        if app.state.gemini_helper.model is not None:
            print("  ✅ Gemini AI: configured")
        else:
            print("  ⚠️  Gemini AI: not configured (set GEMINI_API_KEY)")
    except Exception as e:
        print(f"  ❌ Gemini helper failed to init: {e}")
        app.state.gemini_helper = None

    # --- Food Detector (Gemini primary, Roboflow fallback) ---
    try:
        app.state.food_detector = FoodDetector(gemini_helper=app.state.gemini_helper)
    except Exception as e:
        print(f"  ❌ Food detector failed to init: {e}")
        app.state.food_detector = None

    # --- Date Extractor (EasyOCR) ---
    try:
        app.state.date_extractor = DateExtractor()
        if app.state.date_extractor.reader is not None:
            print("  ✅ Date extractor: EasyOCR loaded")
        else:
            print("  ⚠️  Date extractor: EasyOCR unavailable")
    except Exception as e:
        print(f"  ❌ Date extractor failed to init: {e}")
        app.state.date_extractor = None

    # --- Uploads directory ---
    Path("uploads").mkdir(exist_ok=True)

    print("=" * 50)
    print("🟢 FridgeTrack API is ready!\n")

    yield

    # Shutdown
    print("👋 Shutting down FridgeTrack API...")
    await close_mongo_connection()


# Create FastAPI app
app = FastAPI(
    title="FridgeTrack API",
    description="Smart fridge inventory management to reduce food waste",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== HEALTH CHECK ====================
@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "🍎 FridgeTrack API is running!",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    db = get_database()

    def _detector_status():
        detector = getattr(app.state, 'food_detector', None)
        if detector is None:
            return "not loaded"
        return "mock" if detector.mock_mode else "loaded"

    def _extractor_status():
        extractor = getattr(app.state, 'date_extractor', None)
        if extractor is None:
            return "not loaded"
        return "loaded" if extractor.reader is not None else "unavailable"

    def _gemini_status():
        helper = getattr(app.state, 'gemini_helper', None)
        if helper is None:
            return "not loaded"
        return "loaded" if helper.model is not None else "unconfigured"

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if db is not None else "disconnected",
        "components": {
            "food_detector": _detector_status(),
            "date_extractor": _extractor_status(),
            "gemini": _gemini_status(),
        }
    }


# ==================== IMAGE SCANNING ====================
@app.post("/api/scan", response_model=ScanResponse)
async def scan_fridge(
    file: UploadFile = File(..., alias="image"),  # Accept 'image' from frontend
    user_id: str = Form(default="demo_user")      # Default value if not provided
):
    """
    Scan a fridge image to detect food items and expiration dates

    Args:
        file: Uploaded image file
        user_id: User ID for tracking inventory

    Returns:
        Detection results with items found
    """
    start_time = time.time()
    db = get_database()

    try:
        # Save uploaded file temporarily
        file_path = f"uploads/{user_id}_{int(time.time())}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"📸 Processing scan for user {user_id}: {file_path}")

        # Step 1: Detect food items
        if app.state.food_detector is None:
            raise HTTPException(status_code=503, detail="Food detector is not available. Check server logs.")

        detections = app.state.food_detector.detect_items(file_path, confidence_threshold=0.4)

        if not detections:
            raise HTTPException(status_code=400, detail="No items detected. Try getting closer or improving lighting.")

        # Step 2: Build detection results and store in inventory
        detected_items = []

        for detection in detections:
            detected_item = DetectionResult(
                item_name=detection["item_name"],
                confidence=detection["confidence"],
                bounding_box=detection["bounding_box"],
                expiration_date=None
            )
            detected_items.append(detected_item)

            # Store in MongoDB inventory
            inventory_item = InventoryItem(
                user_id=user_id,
                item_name=detection["item_name"],
                confidence_score=detection["confidence"],
                image_url=file_path,
                status="active"
            )

            await db.inventory_items.insert_one(inventory_item.model_dump(by_alias=True, exclude=['id']))

        # Step 3: Record the scan in database
        processing_time = time.time() - start_time

        scan_record = Scan(
            user_id=user_id,
            items_detected=len(detected_items),
            image_url=file_path,
            processing_time=processing_time
        )

        scan_result = await db.scans.insert_one(scan_record.model_dump(by_alias=True, exclude=['id']))
        scan_id = str(scan_result.inserted_id)

        print(f"✅ Scan complete: {len(detected_items)} items in {processing_time:.2f}s")

        return ScanResponse(
            scan_id=scan_id,
            items_detected=detected_items,
            total_items=len(detected_items),
            processing_time=round(processing_time, 2),
            message=f"Successfully detected {len(detected_items)} items!"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during scan: {e}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


# ==================== INVENTORY MANAGEMENT ====================
@app.get("/api/inventory/{user_id}")
async def get_inventory(user_id: str, status: str = "active"):
    """
    Get user's current inventory

    Args:
        user_id: User ID
        status: Filter by status (active, consumed, wasted)

    Returns:
        List of inventory items
    """
    db = get_database()

    try:
        items_cursor = db.inventory_items.find({
            "user_id": user_id,
            "status": status
        }).sort("detected_at", -1)

        items = await items_cursor.to_list(length=100)

        # Convert ObjectId to string
        for item in items:
            item["_id"] = str(item["_id"])
            if item.get("expiration_date"):
                item["expiration_date"] = item["expiration_date"].isoformat()

        return {
            "user_id": user_id,
            "items": items,
            "total": len(items)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch inventory: {str(e)}")


@app.get("/api/expiring-items/{user_id}", response_model=ExpiringItemsResponse)
async def get_expiring_items(user_id: str, days: int = 3):
    """
    Get items expiring within specified days

    Args:
        user_id: User ID
        days: Number of days to look ahead (default: 3)

    Returns:
        List of items expiring soon with urgency breakdown
    """
    db = get_database()

    try:
        # Calculate date range
        today = datetime.utcnow()
        future_date = today + timedelta(days=days)

        # Find expiring items
        items_cursor = db.inventory_items.find({
            "user_id": user_id,
            "status": "active",
            "expiration_date": {
                "$gte": today,
                "$lte": future_date
            }
        }).sort("expiration_date", 1)

        items = await items_cursor.to_list(length=100)

        # Categorize by urgency
        urgency = {"today": 0, "tomorrow": 0, "this_week": 0}
        expiring_items = []

        for item in items:
            item["_id"] = str(item["_id"])

            exp_date = item.get("expiration_date")
            if exp_date:
                days_left = (exp_date - today).days

                if days_left == 0:
                    urgency["today"] += 1
                elif days_left == 1:
                    urgency["tomorrow"] += 1
                else:
                    urgency["this_week"] += 1

                item["expiration_date"] = exp_date.isoformat()
                item["days_left"] = days_left

            expiring_items.append(InventoryItem(**item))

        print(f"⏰ Found {len(expiring_items)} items expiring for user {user_id}")

        return ExpiringItemsResponse(
            user_id=user_id,
            expiring_items=expiring_items,
            total_expiring=len(expiring_items),
            urgency_breakdown=urgency
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch expiring items: {str(e)}")


# ==================== RECIPE GENERATION ====================
@app.get("/api/recipes/{user_id}", response_model=RecipeResponse)
async def get_recipes(user_id: str, days: int = 3):
    """
    Generate recipes using expiring ingredients

    Args:
        user_id: User ID
        days: Look for items expiring within this many days

    Returns:
        Recipe suggestions using expiring items
    """
    db = get_database()

    try:
        # Get expiring items
        today = datetime.utcnow()
        future_date = today + timedelta(days=days)

        items_cursor = db.inventory_items.find({
            "user_id": user_id,
            "status": "active",
            "expiration_date": {
                "$gte": today,
                "$lte": future_date
            }
        })

        items = await items_cursor.to_list(length=50)

        if not items:
            return RecipeResponse(
                recipes=[],
                expiring_items_used=[],
                message="No expiring items found. Your fridge is in good shape!"
            )

        # Extract item names
        expiring_item_names = [item["item_name"] for item in items]

        # Generate recipes with Gemini
        if app.state.gemini_helper is None:
            raise HTTPException(status_code=503, detail="Gemini AI is not available. Set GEMINI_API_KEY.")
        recipes = app.state.gemini_helper.generate_recipes(expiring_item_names, max_recipes=3)

        recipe_objects = [Recipe(**recipe) for recipe in recipes]

        print(f"🍳 Generated {len(recipe_objects)} recipes for user {user_id}")

        return RecipeResponse(
            recipes=recipe_objects,
            expiring_items_used=expiring_item_names,
            message=f"Here are {len(recipe_objects)} recipes using your expiring items!"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}")


# ==================== SHOPPING LIST ====================
@app.get("/api/shopping-list/{user_id}")
async def get_shopping_list(user_id: str):
    """
    Generate smart shopping list based on consumption patterns

    Args:
        user_id: User ID

    Returns:
        Suggested items to buy
    """
    db = get_database()

    try:
        # Get current inventory
        current_items = await db.inventory_items.find({
            "user_id": user_id,
            "status": "active"
        }).to_list(length=100)

        current_item_names = [item["item_name"] for item in current_items]

        # Get scan history (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        scan_history = await db.scans.find({
            "user_id": user_id,
            "scanned_at": {"$gte": thirty_days_ago}
        }).to_list(length=100)

        # Generate suggestions with Gemini
        if app.state.gemini_helper is None:
            raise HTTPException(status_code=503, detail="Gemini AI is not available. Set GEMINI_API_KEY.")
        suggestions = app.state.gemini_helper.generate_shopping_suggestions(
            current_item_names,
            scan_history
        )

        print(f"🛒 Generated shopping list for user {user_id}: {len(suggestions)} items")

        return {
            "user_id": user_id,
            "shopping_items": suggestions,
            "total_items": len(suggestions),
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate shopping list: {str(e)}")


# ==================== STATISTICS & IMPACT ====================
@app.get("/api/stats/{user_id}", response_model=StatsResponse)
async def get_user_stats(user_id: str):
    """
    Get user statistics and environmental impact

    Args:
        user_id: User ID

    Returns:
        Statistics about food saved, money saved, environmental impact
    """
    db = get_database()

    try:
        # Count all items tracked
        total_items = await db.inventory_items.count_documents({"user_id": user_id})

        # Count items by status
        items_saved = await db.inventory_items.count_documents({
            "user_id": user_id,
            "status": "consumed"
        })

        items_wasted = await db.inventory_items.count_documents({
            "user_id": user_id,
            "status": "wasted"
        })

        # Calculate savings (rough estimates)
        avg_item_cost = 3.0  # $3 per item average
        avg_item_weight = 0.5  # 0.5 lbs per item average
        co2_per_lb = 0.8  # 0.8 kg CO2 per lb of food

        money_saved = items_saved * avg_item_cost
        pounds_saved = items_saved * avg_item_weight
        co2_saved = pounds_saved * co2_per_lb

        print(f"📊 Stats for user {user_id}: {total_items} total, {items_saved} saved")

        return StatsResponse(
            total_items_tracked=total_items,
            items_saved=items_saved,
            items_wasted=items_wasted,
            money_saved=round(money_saved, 2),
            pounds_saved=round(pounds_saved, 2),
            co2_saved=round(co2_saved, 2)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


# ==================== ITEM STATUS UPDATE ====================
@app.put("/api/items/{item_id}/status")
async def update_item_status(item_id: str, status: str = Form(...)):
    """
    Update item status (consumed, wasted, active)

    Args:
        item_id: MongoDB item ID
        status: New status (active, consumed, wasted)

    Returns:
        Updated item
    """
    db = get_database()

    if status not in ["active", "consumed", "wasted"]:
        raise HTTPException(status_code=400, detail="Invalid status. Use: active, consumed, or wasted")

    try:
        from bson import ObjectId

        result = await db.inventory_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"status": status}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")

        return {"message": f"Item status updated to {status}", "item_id": item_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update item: {str(e)}")


# ==================== RUN SERVER ====================
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"\n🚀 Starting FridgeTrack API on {host}:{port}")
    print(f"📚 Documentation available at: http://localhost:{port}/docs\n")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True  # Auto-reload on code changes (disable in production)
    )

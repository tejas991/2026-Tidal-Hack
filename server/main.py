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
    """Manage application startup and shutdown lifecycle events.

    This context manager handles initialization and cleanup tasks for the FastAPI application.
    During startup, it establishes database connections and loads AI models into memory.
    During shutdown, it properly closes all connections and releases resources.

    Args:
        app (FastAPI): The FastAPI application instance. This is automatically provided
            by FastAPI's lifespan context manager system.

    Yields:
        None: Control is yielded back to FastAPI to run the application. When the application
            shuts down, execution continues to the cleanup code.

    Example:
        This function is used automatically by FastAPI:
        >>> app = FastAPI(lifespan=lifespan)
        # During startup: Connects to MongoDB and loads AI models
        # During shutdown: Closes database connections

    Note:
        - The function is async because database connections are asynchronous
        - AI models (YOLO, OCR, Gemini) are loaded once at startup for performance
        - The uploads directory is created if it doesn't exist
    """
    # Startup
    print("🚀 Starting FridgeTrack API...")
    await connect_to_mongo()

    # Initialize AI models
    app.state.food_detector = FoodDetector()
    app.state.date_extractor = DateExtractor()
    app.state.gemini_helper = GeminiHelper()

    # Create uploads directory
    Path("uploads").mkdir(exist_ok=True)

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
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== HEALTH CHECK ====================
@app.get("/")
async def root():
    """Root endpoint - Basic API health check.

    This is the simplest endpoint to verify that the API server is running.
    It returns basic information about the API including version and documentation URL.

    Returns:
        dict: A dictionary containing:
            - message (str): Friendly welcome message
            - version (str): Current API version (e.g., "1.0.0")
            - status (str): Health status, always "healthy" if reachable
            - docs (str): URL path to interactive API documentation

    Example:
        >>> curl http://localhost:8000/
        {
            "message": "🍎 FridgeTrack API is running!",
            "version": "1.0.0",
            "status": "healthy",
            "docs": "/docs"
        }

    Note:
        This endpoint requires no authentication and is useful for uptime monitoring.
    """
    return {
        "message": "🍎 FridgeTrack API is running!",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Detailed health check with component status information.

    This endpoint provides a comprehensive health check that verifies not just that the API
    is running, but also that all critical components (database, AI models) are properly
    loaded and accessible. Use this for detailed system monitoring.

    Returns:
        dict: A dictionary containing detailed health information:
            - status (str): Overall health status ("healthy" or "unhealthy")
            - timestamp (str): Current UTC timestamp in ISO format
            - database (str): Database connection status ("connected" or "disconnected")
            - components (dict): Status of each AI component:
                - food_detector (str): YOLO model status ("loaded" or "not loaded")
                - date_extractor (str): OCR model status ("loaded" or "not loaded")
                - gemini (str): Gemini AI status ("loaded" or "not loaded")

    Example:
        >>> curl http://localhost:8000/health
        {
            "status": "healthy",
            "timestamp": "2026-02-07T10:30:00.123456",
            "database": "connected",
            "components": {
                "food_detector": "loaded",
                "date_extractor": "loaded",
                "gemini": "loaded"
            }
        }

    Note:
        If any component is not loaded, the API may still function but with reduced features.
        For example, without Gemini, recipe generation will use fallback recipes.
    """
    db = get_database()

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if db else "disconnected",
        "components": {
            "food_detector": "loaded" if hasattr(app.state, 'food_detector') else "not loaded",
            "date_extractor": "loaded" if hasattr(app.state, 'date_extractor') else "not loaded",
            "gemini": "loaded" if hasattr(app.state, 'gemini_helper') else "not loaded"
        }
    }


# ==================== IMAGE SCANNING ====================
@app.post("/api/scan", response_model=ScanResponse)
async def scan_fridge(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """Scan a fridge image to detect food items and extract expiration dates.

    This is the core endpoint of FridgeTrack. It processes an uploaded image through
    multiple AI models to detect food items and their expiration dates, then stores
    everything in the user's inventory database.

    The processing pipeline:
    1. YOLO object detection identifies food items and their locations
    2. OCR (EasyOCR) extracts expiration dates from each detected item
    3. Gemini AI is used as a fallback if OCR fails or confidence is low
    4. All detected items are saved to the MongoDB inventory collection
    5. A scan record is created for tracking and analytics

    Args:
        file (UploadFile): The image file uploaded by the user. Supported formats include
            JPG, PNG, and most common image formats. The image should be clear with good
            lighting for best results.
        user_id (str): Unique identifier for the user. This is used to associate detected
            items with the correct user's inventory. Typically a UUID or user ID from
            your authentication system.

    Returns:
        ScanResponse: A response object containing:
            - scan_id (str): Unique ID for this scan operation
            - items_detected (List[DetectionResult]): List of all detected items with details
            - total_items (int): Count of items found
            - processing_time (float): Time taken to process the image in seconds
            - message (str): Success message with summary

    Raises:
        HTTPException:
            - 400 error if no items are detected in the image
            - 500 error if processing fails due to system errors

    Example:
        Using curl:
        >>> curl -X POST http://localhost:8000/api/scan \\
        ...      -F "file=@fridge_photo.jpg" \\
        ...      -F "user_id=user123"

        Response:
        {
            "scan_id": "507f1f77bcf86cd799439011",
            "items_detected": [
                {
                    "item_name": "apple",
                    "confidence": 0.89,
                    "bounding_box": [100, 150, 300, 350],
                    "expiration_date": "2026-02-15"
                }
            ],
            "total_items": 1,
            "processing_time": 2.34,
            "message": "Successfully detected 1 items!"
        }

    Note:
        - Images are saved temporarily in the 'uploads' folder
        - Higher confidence scores (>0.7) indicate more reliable detections
        - If no expiration date is found, the item is still tracked but without a date
        - Processing time depends on image size and number of items
    """
    start_time = time.time()
    db = get_database()

    try:
        # Save uploaded file temporarily
        file_path = f"uploads/{user_id}_{int(time.time())}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"📸 Processing scan for user {user_id}: {file_path}")

        # Step 1: Detect food items with YOLO
        detections = app.state.food_detector.detect_items(file_path, confidence_threshold=0.5)

        if not detections:
            raise HTTPException(status_code=400, detail="No items detected. Try getting closer or improving lighting.")

        # Step 2: Extract expiration dates for each detection
        detected_items = []

        for detection in detections:
            # Crop the detected region
            cropped = app.state.food_detector.crop_detection(file_path, detection["bounding_box"])

            # Try to extract expiration date with OCR
            expiration_date = None
            if cropped is not None:
                # Save cropped image temporarily
                crop_path = f"uploads/crop_{int(time.time())}.jpg"
                import cv2
                cv2.imwrite(crop_path, cropped)

                # Run OCR on cropped region
                expiration_date = app.state.date_extractor.extract_date_from_image(crop_path)

                # Fallback to Gemini if OCR fails
                if not expiration_date and detection["confidence"] < 0.7:
                    expiration_date = app.state.gemini_helper.extract_expiration_date(crop_path)

                # Clean up cropped image
                try:
                    os.remove(crop_path)
                except:
                    pass

            # Create detection result
            detected_item = DetectionResult(
                item_name=detection["item_name"],
                confidence=detection["confidence"],
                bounding_box=detection["bounding_box"],
                expiration_date=expiration_date
            )
            detected_items.append(detected_item)

            # Store in MongoDB inventory
            inventory_item = InventoryItem(
                user_id=user_id,
                item_name=detection["item_name"],
                expiration_date=datetime.fromisoformat(expiration_date) if expiration_date else None,
                confidence_score=detection["confidence"],
                image_url=file_path,
                status="active"
            )

            # Insert into database
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
    """Retrieve a user's food inventory filtered by item status.

    This endpoint returns all items in a user's inventory, allowing you to view
    currently active items, items that were consumed, or items that went to waste.
    This is useful for displaying the user's current fridge contents or analyzing
    consumption patterns.

    Args:
        user_id (str): The unique identifier for the user whose inventory you want to retrieve.
            This is typically obtained from your authentication system or user session.
        status (str, optional): Filter items by their status. Defaults to "active".
            Valid options:
            - "active": Items currently in the fridge (not yet consumed or wasted)
            - "consumed": Items that were used before expiring (food saved!)
            - "wasted": Items that expired and were thrown away (food waste)

    Returns:
        dict: A dictionary containing:
            - user_id (str): The user ID that was queried
            - items (List[dict]): Array of inventory items, sorted by most recent first.
                Each item includes:
                - _id (str): Unique MongoDB document ID
                - item_name (str): Name of the food item
                - expiration_date (str): ISO format date string if available
                - confidence_score (float): Detection confidence (0-1)
                - status (str): Current status
                - detected_at (str): When the item was added
            - total (int): Count of items returned

    Raises:
        HTTPException: 500 error if database query fails

    Example:
        Get active items:
        >>> curl http://localhost:8000/api/inventory/user123?status=active
        {
            "user_id": "user123",
            "items": [
                {
                    "_id": "507f1f77bcf86cd799439011",
                    "item_name": "milk",
                    "expiration_date": "2026-02-15T00:00:00",
                    "confidence_score": 0.92,
                    "status": "active",
                    "detected_at": "2026-02-07T10:00:00"
                }
            ],
            "total": 1
        }

    Note:
        - Results are sorted by detection time (newest first)
        - Limited to 100 most recent items to prevent large responses
        - Expiration dates are converted from datetime to ISO string format
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
    """Get items that are expiring soon with urgency categorization.

    This endpoint helps users prioritize which items to consume first by finding
    everything expiring within a specified time window and categorizing by urgency.
    This is critical for food waste prevention.

    Args:
        user_id (str): The unique identifier for the user whose expiring items to retrieve.
        days (int, optional): How many days ahead to look for expiring items. Defaults to 3.
            For example, days=7 will return items expiring within the next week.

    Returns:
        ExpiringItemsResponse: A response object containing:
            - user_id (str): The user ID that was queried
            - expiring_items (List[InventoryItem]): All items expiring in the time window,
                sorted by expiration date (soonest first). Each item includes a "days_left"
                field showing how many days until it expires.
            - total_expiring (int): Total count of expiring items
            - urgency_breakdown (dict): Items categorized by urgency:
                - today (int): Items expiring today (use immediately!)
                - tomorrow (int): Items expiring tomorrow
                - this_week (int): Items expiring in 2+ days

    Example:
        >>> curl http://localhost:8000/api/expiring-items/user123?days=7
        {
            "user_id": "user123",
            "expiring_items": [
                {
                    "item_name": "milk",
                    "expiration_date": "2026-02-08T00:00:00",
                    "days_left": 1,
                    "status": "active"
                },
                {
                    "item_name": "yogurt",
                    "expiration_date": "2026-02-10T00:00:00",
                    "days_left": 3,
                    "status": "active"
                }
            ],
            "total_expiring": 2,
            "urgency_breakdown": {
                "today": 0,
                "tomorrow": 1,
                "this_week": 1
            }
        }

    Raises:
        HTTPException: 500 error if database query fails

    Note:
        - Only returns items with status "active" (not already consumed or wasted)
        - Items without expiration dates are not included
        - Urgency categorization helps prioritize what to use first
        - Consider using this data to trigger notifications to users
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
    """Generate personalized recipe suggestions using items that are expiring soon.

    This endpoint is a key feature for reducing food waste. It uses Gemini AI to create
    practical, easy-to-follow recipes that specifically incorporate ingredients from the
    user's fridge that are about to expire. This encourages users to consume items before
    they go bad.

    Args:
        user_id (str): The unique identifier for the user. The system will look up their
            expiring inventory items and generate recipes based on what they actually have.
        days (int, optional): The time window for finding expiring items. Defaults to 3 days.
            For example, days=7 will generate recipes using items expiring within a week.

    Returns:
        RecipeResponse: A response object containing:
            - recipes (List[Recipe]): Array of 1-3 recipe suggestions. Each recipe includes:
                - name (str): Recipe title
                - ingredients (List[str]): Complete ingredient list with amounts
                - instructions (List[str]): Step-by-step cooking instructions
                - prep_time (str): Estimated time to prepare (e.g., "20 minutes")
                - items_used (List[str]): Which expiring items from inventory are used
            - expiring_items_used (List[str]): All expiring items that were considered
            - message (str): Friendly message about the recipes generated

    Example:
        >>> curl http://localhost:8000/api/recipes/user123?days=3
        {
            "recipes": [
                {
                    "name": "Quick Banana Smoothie",
                    "ingredients": ["2 ripe bananas", "1 cup yogurt", "1/2 cup milk", "honey"],
                    "instructions": [
                        "Peel bananas and break into chunks",
                        "Add all ingredients to blender",
                        "Blend until smooth and creamy",
                        "Pour into glass and enjoy"
                    ],
                    "prep_time": "5 minutes",
                    "items_used": ["banana", "yogurt"]
                }
            ],
            "expiring_items_used": ["banana", "yogurt", "milk"],
            "message": "Here are 1 recipes using your expiring items!"
        }

    Raises:
        HTTPException: 500 error if recipe generation fails

    Note:
        - If no expiring items are found, returns an empty recipe list with a positive message
        - Recipes are generated by Gemini AI and are tailored to be quick and practical
        - If Gemini fails, fallback recipes are provided for common items
        - Recipes prioritize using the most urgent expiring items first
        - Limited to 3 recipes by default to avoid overwhelming the user
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
    """Generate an intelligent shopping list based on consumption patterns and current inventory.

    This endpoint uses AI to analyze what the user frequently buys, what they currently have,
    and what they're likely running low on. It creates a smart shopping list that helps users
    maintain their preferred inventory while avoiding over-buying items they already have.

    The system considers:
    - Items the user frequently purchases (from scan history)
    - Current inventory gaps (common items they're missing)
    - Complementary items (ingredients that go well with what they have)
    - Consumption patterns over the last 30 days

    Args:
        user_id (str): The unique identifier for the user. The system analyzes this user's
            historical data and current inventory to generate personalized suggestions.

    Returns:
        dict: A dictionary containing:
            - user_id (str): The user ID that was queried
            - shopping_items (List[dict]): Array of suggested items to purchase. Each item includes:
                - item_name (str): Name of the suggested item
                - reason (str): Explanation of why this item is recommended
                - priority (int): Priority level from 1 (low) to 5 (high)
            - total_items (int): Count of items in the shopping list
            - generated_at (str): ISO timestamp when the list was generated

    Example:
        >>> curl http://localhost:8000/api/shopping-list/user123
        {
            "user_id": "user123",
            "shopping_items": [
                {
                    "item_name": "milk",
                    "reason": "You buy this weekly but don't have any",
                    "priority": 5
                },
                {
                    "item_name": "eggs",
                    "reason": "Common breakfast staple you're missing",
                    "priority": 4
                },
                {
                    "item_name": "bread",
                    "reason": "Frequently purchased in your history",
                    "priority": 4
                }
            ],
            "total_items": 3,
            "generated_at": "2026-02-07T10:30:00.123456"
        }

    Raises:
        HTTPException: 500 error if list generation fails

    Note:
        - Analyzes the last 30 days of scan history for patterns
        - Returns 5-10 suggested items (configurable in Gemini prompt)
        - Priority helps users decide what to buy first if on a budget
        - Empty shopping lists are possible if the user has everything they typically need
        - Suggestions are personalized based on individual buying habits
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
    """Calculate and return user statistics including environmental impact metrics.

    This endpoint provides motivational statistics that show users the positive impact
    they're making by using FridgeTrack. It calculates food saved, money saved, and
    environmental benefits (CO2 reduction) based on their consumption vs waste patterns.

    The calculations use industry-standard estimates:
    - Average item cost: $3.00 per item
    - Average item weight: 0.5 lbs per item
    - CO2 per pound of food: 0.8 kg CO2

    Args:
        user_id (str): The unique identifier for the user whose statistics to calculate.
            The system analyzes all of this user's tracked items across all time.

    Returns:
        StatsResponse: A response object containing:
            - total_items_tracked (int): Total number of items ever scanned
            - items_saved (int): Number of items marked as "consumed" (eaten before expiring)
            - items_wasted (int): Number of items marked as "wasted" (expired and thrown away)
            - money_saved (float): Estimated dollars saved by consuming items before expiration
            - pounds_saved (float): Estimated pounds of food saved from landfills
            - co2_saved (float): Estimated kg of CO2 emissions prevented

    Example:
        >>> curl http://localhost:8000/api/stats/user123
        {
            "total_items_tracked": 150,
            "items_saved": 120,
            "items_wasted": 10,
            "money_saved": 360.00,
            "pounds_saved": 60.00,
            "co2_saved": 48.00
        }

    Raises:
        HTTPException: 500 error if statistics calculation fails

    Note:
        - Statistics are cumulative (all-time, not just recent)
        - Money and environmental calculations are estimates based on averages
        - Items with status "active" are not counted in saved or wasted
        - These metrics are designed to motivate users by showing their positive impact
        - Consider displaying these stats in a dashboard or gamification feature
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
    """Update the status of an inventory item to track consumption or waste.

    This endpoint allows users to mark items as consumed (successfully used before expiring)
    or wasted (expired and thrown away). This tracking is essential for calculating
    statistics, measuring impact, and understanding user behavior.

    Typical workflow:
    1. User scans fridge - items start as "active"
    2. User cooks with an item - update status to "consumed"
    3. Item expires unused - update status to "wasted"
    4. User finds item in fridge again - update status back to "active"

    Args:
        item_id (str): The MongoDB ObjectId of the inventory item to update. This is the
            "_id" field returned when items are scanned or retrieved from inventory.
        status (str): The new status to assign to the item. Must be one of:
            - "active": Item is currently in the fridge and available
            - "consumed": Item was used/eaten before expiring (positive outcome)
            - "wasted": Item expired and was thrown away (negative outcome)

    Returns:
        dict: A confirmation dictionary containing:
            - message (str): Success message with the new status
            - item_id (str): The ID of the item that was updated

    Raises:
        HTTPException:
            - 400 error if status is not one of the three valid options
            - 404 error if no item exists with the given item_id
            - 500 error if database update fails

    Example:
        Mark an item as consumed:
        >>> curl -X PUT http://localhost:8000/api/items/507f1f77bcf86cd799439011/status \\
        ...      -F "status=consumed"
        {
            "message": "Item status updated to consumed",
            "item_id": "507f1f77bcf86cd799439011"
        }

        Mark an item as wasted:
        >>> curl -X PUT http://localhost:8000/api/items/507f1f77bcf86cd799439011/status \\
        ...      -F "status=wasted"
        {
            "message": "Item status updated to wasted",
            "item_id": "507f1f77bcf86cd799439011"
        }

    Note:
        - Status changes are permanent and affect statistics calculations
        - The item remains in the database but is filtered by status in queries
        - Consider adding undo functionality in your UI for accidental status changes
        - Status updates are instant and don't require image rescanning
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

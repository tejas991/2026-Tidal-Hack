"""
Pydantic models for data validation
These define the structure of data we store in MongoDB
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Annotated
from datetime import datetime
from bson import ObjectId


# Simple string type for MongoDB IDs (Pydantic v2 compatible)
PyObjectId = Annotated[str, Field(description="MongoDB ObjectId as string")]


# User Model
class User(BaseModel):
    """User account information"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(alias="_id", default=None)
    username: str
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Inventory Item Model
class InventoryItem(BaseModel):
    """Detected food item in user's inventory"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    item_name: str
    expiration_date: Optional[datetime] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float
    image_url: Optional[str] = None
    quantity: int = 1
    category: Optional[str] = None  # dairy, produce, meat, etc.
    status: str = "active"  # active, consumed, wasted


# Scan Model
class Scan(BaseModel):
    """Record of a fridge scan"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    items_detected: int = 0
    image_url: Optional[str] = None
    processing_time: Optional[float] = None  # in seconds


# Detection Result Model
class DetectionResult(BaseModel):
    """Result from YOLO object detection"""
    item_name: str
    confidence: float
    bounding_box: List[float]  # [x1, y1, x2, y2]
    expiration_date: Optional[str] = None


# Recipe Model
class Recipe(BaseModel):
    """Generated recipe using expiring items"""
    name: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: str
    items_used: List[str]  # which inventory items this uses


# Shopping List Item Model
class ShoppingListItem(BaseModel):
    """Item suggested for shopping list"""
    item_name: str
    reason: str  # why it's suggested
    priority: int  # 1-5, 5 being highest
    frequency: int = 0  # how often user buys this


# API Response Models
class ScanResponse(BaseModel):
    """Response after scanning an image"""
    scan_id: str
    items_detected: List[DetectionResult]
    total_items: int
    processing_time: float
    message: str


class ExpiringItemsResponse(BaseModel):
    """Response for expiring items endpoint"""
    user_id: str
    expiring_items: List[InventoryItem]
    total_expiring: int
    urgency_breakdown: dict  # {"today": 2, "tomorrow": 3, "this_week": 5}


class RecipeResponse(BaseModel):
    """Response for recipe generation"""
    recipes: List[Recipe]
    expiring_items_used: List[str]
    message: str


class StatsResponse(BaseModel):
    """User statistics and impact"""
    total_items_tracked: int
    items_saved: int
    items_wasted: int
    money_saved: float
    pounds_saved: float
    co2_saved: float

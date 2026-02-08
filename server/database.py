"""
Database configuration and connection management
This file handles the connection to MongoDB Atlas
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
import certifi
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection URL from environment variables
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "fridgetrack")

# Async MongoDB client for FastAPI
client: AsyncIOMotorClient = None
database = None


async def connect_to_mongo():
    """Connect to MongoDB when the application starts.
    Raises on failure so the caller can decide whether to continue."""
    global client, database
    try:
        client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=True,
        )
        database = client[DATABASE_NAME]

        # Test the connection
        await client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")

        # Create indexes for better performance
        await database.inventory_items.create_index("user_id")
        await database.inventory_items.create_index("expiration_date")
        await database.scans.create_index("user_id")

    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection when the application shuts down"""
    global client
    if client:
        client.close()
        print("🔌 Closed MongoDB connection")


def get_database():
    """Get the database instance"""
    return database

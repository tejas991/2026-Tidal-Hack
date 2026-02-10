"""
Database configuration and connection management
This file handles the connection to MongoDB Atlas
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection URL from environment variables
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "fridgetrack")

# Async MongoDB client for FastAPI
client: AsyncIOMotorClient = None
database = None


async def connect_to_mongo():
    """Establish connection to MongoDB Atlas and initialize database indexes.

    This function is called during application startup to establish an asynchronous
    connection to the MongoDB database. It also creates indexes on frequently queried
    fields to improve query performance.

    The function performs these steps:
    1. Creates an async MongoDB client using the connection URL from environment variables
    2. Connects to the specified database
    3. Tests the connection by sending a ping command
    4. Creates indexes on user_id and expiration_date fields for better performance

    Raises:
        Exception: If connection fails, the exception is logged and re-raised to prevent
            the application from starting without database access.

    Example:
        This function is typically called in the FastAPI lifespan context:
        >>> await connect_to_mongo()
        ✅ Connected to MongoDB: fridgetrack

    Note:
        - Uses global variables to maintain connection across the application
        - Connection URL should be stored in MONGODB_URL environment variable
        - Database name should be stored in DATABASE_NAME environment variable
        - Indexes are created if they don't already exist (safe to call multiple times)
        - The connection is async-friendly for use with FastAPI
    """
    global client, database
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
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
    """Gracefully close the MongoDB connection during application shutdown.

    This function ensures that the database connection is properly closed when the
    application stops. Proper cleanup prevents connection leaks and ensures all
    pending operations are completed.

    Example:
        This function is typically called in the FastAPI lifespan context:
        >>> await close_mongo_connection()
        🔌 Closed MongoDB connection

    Note:
        - Only closes the connection if a client exists
        - Safe to call even if no connection was established
        - Should always be called during application shutdown
    """
    global client
    if client:
        client.close()
        print("🔌 Closed MongoDB connection")


def get_database():
    """Get the active MongoDB database instance for performing queries.

    This is a helper function that provides access to the MongoDB database connection
    throughout the application. It returns the database instance that was established
    by connect_to_mongo().

    Returns:
        AsyncIOMotorDatabase or None: The MongoDB database instance if connected,
            or None if no connection has been established yet.

    Example:
        Use this to access collections in your endpoints:
        >>> db = get_database()
        >>> items = await db.inventory_items.find({"user_id": "user123"}).to_list(100)

    Note:
        - Returns None if called before connect_to_mongo()
        - The returned database object is async-compatible
        - Common collections: inventory_items, scans
    """
    return database

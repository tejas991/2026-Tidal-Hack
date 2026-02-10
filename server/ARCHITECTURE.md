# 🏗️ FridgeTrack Backend Architecture

**Understanding how everything fits together**

---

## 📊 High-Level Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │  HTTP   │   FastAPI    │  Async  │  MongoDB    │
│  Frontend   │ ◄─────► │   Backend    │ ◄─────► │   Atlas     │
│  (Client)   │         │  (Server)    │         │  (Database) │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
              ┌─────▼───┐ ┌────▼────┐ ┌──▼─────┐
              │  YOLO   │ │ EasyOCR │ │ Gemini │
              │ Vision  │ │  Text   │ │   AI   │
              └─────────┘ └─────────┘ └────────┘
```

---

## 🗂️ Project Structure

```
server/
│
├── main.py                 # 🚀 Main FastAPI application
│   └── Contains all API endpoints
│
├── database.py             # 🗄️ MongoDB connection manager
│   ├── connect_to_mongo()
│   ├── close_mongo_connection()
│   └── get_database()
│
├── models.py               # 📋 Data models (schemas)
│   ├── User
│   ├── InventoryItem
│   ├── Scan
│   ├── Recipe
│   └── Response models
│
├── utils/                  # 🛠️ Helper modules
│   ├── food_detector.py   # YOLO object detection
│   ├── date_extractor.py  # OCR for dates
│   └── gemini_helper.py   # AI recipe generation
│
├── requirements.txt        # 📦 Python dependencies
├── .env                    # 🔐 Secret configuration
├── README.md              # 📚 Main documentation
├── SETUP_GUIDE.md         # 🎓 Beginner's guide
├── API_REFERENCE.md       # 📖 API endpoints reference
├── ARCHITECTURE.md        # 🏗️ This file
└── test_api.py            # 🧪 Testing script
```

---

## 🔄 Request Flow

### Example: Scanning a Fridge Image

```
1. User uploads image from React app
   ↓
2. POST request to /api/scan
   ↓
3. FastAPI receives file and user_id
   ↓
4. Save image to uploads/ folder
   ↓
5. YOLO detects objects in image
   ├── Returns: bounding boxes, class names, confidence
   ↓
6. For each detected item:
   ├── Crop the region around detection
   ├── Run EasyOCR to find expiration date
   ├── If OCR fails → Fallback to Gemini AI
   ↓
7. Save all items to MongoDB:
   ├── inventory_items collection
   └── scans collection (for history)
   ↓
8. Return JSON response to frontend
   └── {items_detected, processing_time, scan_id}
```

---

## 🧩 Component Details

### 1. FastAPI Application (main.py)

**Purpose**: Web server that handles HTTP requests

**Key Features**:
- **Endpoints**: Define URLs that clients can call
- **Async**: Handles multiple requests simultaneously
- **Auto Docs**: Generates interactive API documentation
- **CORS**: Allows React frontend to communicate

**Example Endpoint**:
```python
@app.post("/api/scan")
async def scan_fridge(file: UploadFile, user_id: str):
    # 1. Receive image
    # 2. Process with AI
    # 3. Save to database
    # 4. Return results
```

---

### 2. Database Layer (database.py)

**Purpose**: Manages connection to MongoDB

**Key Functions**:
- `connect_to_mongo()`: Establish connection at startup
- `get_database()`: Get database instance for queries
- `close_mongo_connection()`: Clean shutdown

**Why MongoDB?**
- Document-based (stores JSON-like objects)
- Flexible schema (easy to change structure)
- Cloud-hosted (MongoDB Atlas)
- Free tier available

**Collections** (like tables in SQL):
- `users`: User accounts
- `inventory_items`: Detected food items
- `scans`: Scan history

---

### 3. Data Models (models.py)

**Purpose**: Define the structure of data

Uses **Pydantic** for:
- Data validation
- Type checking
- Automatic JSON conversion

**Example**:
```python
class InventoryItem(BaseModel):
    user_id: str                      # Required
    item_name: str                    # Required
    expiration_date: Optional[datetime] = None  # Optional
    confidence_score: float           # Required
```

**Benefits**:
- Catches errors early (wrong data types)
- Auto-generates API documentation
- Ensures consistent data structure

---

### 4. Food Detection (utils/food_detector.py)

**Purpose**: Detect food items in images using AI

**Technology**: YOLOv8 (You Only Look Once)
- State-of-the-art object detection
- Real-time processing
- Pre-trained on 80 common objects

**How it works**:
1. Load image
2. Run through neural network
3. Output: bounding boxes + class names + confidence

**Methods**:
- `detect_items()`: Find all items in image
- `crop_detection()`: Extract region for OCR

**Example Output**:
```python
[
  {
    "item_name": "bottle",
    "confidence": 0.89,
    "bounding_box": [100, 150, 300, 400]
  }
]
```

---

### 5. Date Extraction (utils/date_extractor.py)

**Purpose**: Read expiration dates from packaging

**Technology**: EasyOCR
- Optical Character Recognition
- Reads text from images
- Supports 80+ languages

**How it works**:
1. Receive cropped image region
2. Extract all text with OCR
3. Search for date patterns (MM/DD/YYYY, etc.)
4. Parse and validate dates
5. Return datetime object

**Challenges**:
- Curved surfaces (bottles)
- Small text
- Poor lighting
- Multiple date formats

**Solution**:
- Multiple regex patterns
- Context-aware (looks for "EXP", "BEST BY")
- Fallback to Gemini AI if uncertain

---

### 6. AI Assistant (utils/gemini_helper.py)

**Purpose**: Advanced AI features using Gemini

**Use Cases**:

1. **Recipe Generation**
   - Input: List of expiring items
   - Output: 3 creative recipes with instructions

2. **Fallback Detection**
   - If YOLO confidence < 70%, use Gemini
   - More accurate for unusual items

3. **Shopping Suggestions**
   - Analyze consumption patterns
   - Suggest items to buy

**How Recipes Work**:
```
1. Get list: ["eggs", "milk", "yogurt"]
2. Send to Gemini with prompt
3. Gemini generates recipes (JSON format)
4. Parse and return to user
```

---

## 🔐 Environment Variables

Stored in `.env` file (never commit to GitHub!)

```env
# MongoDB connection
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/

# Database name
DATABASE_NAME=fridgetrack

# Google Gemini API key
GEMINI_API_KEY=AIza...

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

**Why?**
- Security (keep secrets out of code)
- Flexibility (different values for dev/prod)
- Best practice

---

## 🗄️ Database Schema

### inventory_items Collection

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  user_id: "user123",
  item_name: "milk",
  expiration_date: ISODate("2025-02-15T00:00:00Z"),
  detected_at: ISODate("2025-02-07T10:30:00Z"),
  confidence_score: 0.89,
  image_url: "uploads/user123_1707302400_photo.jpg",
  quantity: 1,
  category: "dairy",
  status: "active"  // or "consumed", "wasted"
}
```

### scans Collection

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  user_id: "user123",
  scanned_at: ISODate("2025-02-07T10:30:00Z"),
  items_detected: 8,
  image_url: "uploads/user123_1707302400_photo.jpg",
  processing_time: 3.42
}
```

### Indexes (for faster queries)

```javascript
inventory_items.createIndex({ user_id: 1 })
inventory_items.createIndex({ expiration_date: 1 })
scans.createIndex({ user_id: 1 })
```

---

## 🚦 API Lifecycle

### Application Startup

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    print("Starting...")
    await connect_to_mongo()
    app.state.food_detector = FoodDetector()
    app.state.date_extractor = DateExtractor()
    app.state.gemini_helper = GeminiHelper()

    yield  # Application runs here

    # SHUTDOWN
    print("Shutting down...")
    await close_mongo_connection()
```

**Why?**
- Load models once at startup (not per request)
- Establish database connection pool
- Clean shutdown when stopped

---

## 🔄 Asynchronous Programming

### Why Async?

**Synchronous** (traditional):
```
Request 1 → [Wait for DB] → Response 1
Request 2 →                → [Wait for DB] → Response 2
```

**Asynchronous** (FastAPI):
```
Request 1 → [Wait for DB] → Response 1
Request 2 → [Wait for DB] → Response 2
Request 3 → [Wait for DB] → Response 3
```

Multiple requests processed simultaneously!

### Syntax

```python
# Async function
async def get_items():
    # Await I/O operations
    items = await db.inventory_items.find().to_list()
    return items
```

**Rules**:
- Use `async def` for async functions
- Use `await` before I/O operations
- FastAPI handles the rest!

---

## 🎯 Key Design Decisions

### 1. Why FastAPI over Flask?

- ✅ Async support (better performance)
- ✅ Auto-generated API docs
- ✅ Built-in data validation (Pydantic)
- ✅ Modern Python features
- ✅ Type hints throughout

### 2. Why MongoDB over PostgreSQL?

- ✅ Flexible schema (easy to iterate)
- ✅ JSON-like documents (matches API responses)
- ✅ Free cloud hosting (Atlas)
- ✅ Good for hackathons (quick setup)

### 3. Why Multiple AI Models?

- **YOLO**: Fast, runs locally, good for common items
- **EasyOCR**: Specialized for text extraction
- **Gemini**: Powerful fallback, creative recipes

Combination provides best accuracy + speed!

### 4. Why Separate Utils?

- ✅ Clean code organization
- ✅ Easy to test individual components
- ✅ Reusable across endpoints
- ✅ Can swap models easily

---

## 🔍 Error Handling Strategy

### 1. Validation Errors (400)
```python
if not detections:
    raise HTTPException(
        status_code=400,
        detail="No items detected. Try better lighting."
    )
```

### 2. Not Found (404)
```python
if not item:
    raise HTTPException(status_code=404, detail="Item not found")
```

### 3. Server Errors (500)
```python
try:
    # Process image
except Exception as e:
    raise HTTPException(
        status_code=500,
        detail=f"Processing failed: {str(e)}"
    )
```

---

## 📈 Performance Considerations

### Bottlenecks

1. **YOLO Detection**: ~1-2 seconds
2. **OCR Processing**: ~1-2 seconds per item
3. **Gemini API**: ~2-5 seconds (network call)

### Optimizations

- **Parallel Processing**: Crop all regions, then batch OCR
- **Caching**: Store model in memory (not load per request)
- **Async**: Don't block while waiting for AI/DB
- **Model Size**: Use YOLOv8n (nano) for speed

### Future Improvements

- Background job queue (Celery)
- Image preprocessing (resize, enhance)
- Model quantization (smaller, faster)
- Redis caching for frequent queries

---

## 🔒 Security Considerations

### Current Implementation

- ✅ CORS configured (only allow frontend)
- ✅ Environment variables for secrets
- ✅ File size limits (default 16MB)
- ✅ Input validation (Pydantic)

### Production Additions Needed

- 🔲 User authentication (JWT tokens)
- 🔲 Rate limiting (prevent abuse)
- 🔲 HTTPS only (encrypt traffic)
- 🔲 File type validation (only images)
- 🔲 Virus scanning for uploads
- 🔲 Database connection encryption

---

## 🧪 Testing Strategy

### Levels of Testing

1. **Unit Tests**: Test individual functions
   ```python
   def test_date_extraction():
       extractor = DateExtractor()
       date = extractor.find_expiration_date(["EXP 02/15/2025"])
       assert date.year == 2025
   ```

2. **Integration Tests**: Test API endpoints
   ```python
   def test_scan_endpoint():
       response = client.post("/api/scan", files=..., data=...)
       assert response.status_code == 200
   ```

3. **Manual Testing**: Use `/docs` interface

### Current Test Script

`test_api.py` checks all endpoints are responsive

---

## 🚀 Deployment Architecture

### Development (Local)

```
Laptop → localhost:8000 → MongoDB Atlas (Cloud)
```

### Production (DigitalOcean)

```
User → CloudFlare CDN → DigitalOcean App Platform
                          ├── FastAPI Server (containerized)
                          └── MongoDB Atlas (Cloud)
```

**Benefits**:
- Auto-scaling
- HTTPS certificates (free)
- GitHub integration (auto-deploy)
- Health monitoring

---

## 📚 Learning Path

To fully understand this codebase:

1. **Python Basics** (if new)
   - Functions, classes, imports
   - List comprehensions
   - Error handling (try/except)

2. **Async Programming**
   - async/await syntax
   - Why it matters for web servers

3. **FastAPI**
   - Routing (@app.get, @app.post)
   - Request handling
   - Response models

4. **Databases**
   - CRUD operations (Create, Read, Update, Delete)
   - Indexes and queries
   - Document vs Relational

5. **Computer Vision**
   - How CNNs work (basics)
   - Object detection concepts
   - OCR fundamentals

---

## 🤝 How Frontend Connects

### React Component Example

```jsx
// 1. Upload image
const formData = new FormData();
formData.append('file', imageFile);
formData.append('user_id', currentUser.id);

// 2. Call backend
const response = await fetch('http://localhost:8000/api/scan', {
  method: 'POST',
  body: formData
});

// 3. Get results
const data = await response.json();

// 4. Display to user
setDetectedItems(data.items_detected);
```

### State Management

```
User scans → Update local state → Fetch inventory → Update UI
```

---

## 🎯 Hackathon Success Tips

1. **Start Simple**: Get basic scan working first
2. **Test Early**: Use `/docs` constantly
3. **Fallbacks**: If YOLO fails, use Gemini only
4. **Mock Data**: Have test images ready
5. **Error Messages**: Make them helpful!
6. **Demo First**: Optimize later

---

## 🔮 Future Enhancements

### Phase 2 (Post-Hackathon)
- User authentication & accounts
- Email/SMS notifications for expiring items
- Barcode scanning integration
- Nutrition information
- Meal planning calendar

### Phase 3 (Production)
- Mobile app (React Native)
- Voice commands (Alexa/Google Home)
- Social features (share recipes)
- Grocery store partnerships
- Sustainability metrics

---

## 📞 Getting Help

**Debugging Checklist**:
1. ✅ Server running? Check terminal
2. ✅ MongoDB connected? Check startup logs
3. ✅ .env file correct? Check values
4. ✅ Dependencies installed? Check `pip list`
5. ✅ Endpoint exists? Check `/docs`

**Reading Logs**:
- 🟢 ✅ = Success
- 🟡 ⚠️  = Warning (still works)
- 🔴 ❌ = Error (needs fixing)

---

**You're now ready to understand, modify, and extend the FridgeTrack backend! 🚀**

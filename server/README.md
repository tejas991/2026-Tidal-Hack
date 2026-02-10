# FridgeTrack Backend API 🍎

Complete FastAPI backend for the FridgeTrack hackathon project. This handles food detection, expiration date tracking, recipe generation, and more!

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- 📸 **Image Scanning**: Upload fridge photos to detect food items
- 🤖 **AI Detection**: YOLOv8 for object detection + Gemini AI fallback
- 📅 **Expiration Tracking**: OCR to read expiration dates from packaging
- 🍳 **Recipe Generation**: AI-powered recipes using expiring ingredients
- 🛒 **Smart Shopping Lists**: Suggestions based on consumption patterns
- 📊 **Impact Tracking**: Calculate money saved and environmental impact
- 🗄️ **MongoDB Storage**: Persistent data storage in the cloud

## 🛠️ Tech Stack

- **FastAPI**: Modern Python web framework
- **MongoDB Atlas**: Cloud database (free tier)
- **YOLOv8**: State-of-the-art object detection
- **EasyOCR**: Text extraction from images
- **Google Gemini AI**: Recipe generation and fallback detection
- **Motor**: Async MongoDB driver

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- MongoDB Atlas account (free)
- Google Gemini API key (free)

### 1. Clone and Navigate

```bash
cd 2026-Tidal-Hack/server
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install all necessary packages (may take 5-10 minutes).

### 4. Set Up Environment Variables

Create a `.env` file in the server directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
MONGODB_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/
DATABASE_NAME=fridgetrack
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
```

### 5. Run the Server

```bash
python main.py
```

The API will start at: **http://localhost:8000**

Visit **http://localhost:8000/docs** to see interactive API documentation!

## 📚 Detailed Setup

### Getting MongoDB Atlas (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Create a new cluster (M0 Free tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password
7. Paste into `.env` file as `MONGODB_URL`

### Getting Gemini API Key (Free)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" → "Create API key"
4. Copy the key and paste into `.env` as `GEMINI_API_KEY`

### Project Structure

```
server/
├── main.py                 # FastAPI application with all endpoints
├── database.py             # MongoDB connection management
├── models.py               # Data models (Pydantic)
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (create this!)
├── .env.example            # Template for .env
├── utils/
│   ├── __init__.py
│   ├── food_detector.py    # YOLO object detection
│   ├── date_extractor.py   # OCR for expiration dates
│   └── gemini_helper.py    # Gemini AI integration
└── uploads/                # Temporary image storage (auto-created)
```

## 🔌 API Endpoints

### Health Check

```http
GET /
GET /health
```

Check if API is running and all components are loaded.

### Scan Fridge Image

```http
POST /api/scan
```

**Parameters:**
- `file`: Image file (multipart/form-data)
- `user_id`: User identifier

**Response:**
```json
{
  "scan_id": "507f1f77bcf86cd799439011",
  "items_detected": [
    {
      "item_name": "milk",
      "confidence": 0.89,
      "bounding_box": [100, 150, 300, 400],
      "expiration_date": "2025-02-15"
    }
  ],
  "total_items": 5,
  "processing_time": 3.42,
  "message": "Successfully detected 5 items!"
}
```

### Get Inventory

```http
GET /api/inventory/{user_id}?status=active
```

Get all items in user's inventory.

### Get Expiring Items

```http
GET /api/expiring-items/{user_id}?days=3
```

Get items expiring within specified days (default: 3).

### Generate Recipes

```http
GET /api/recipes/{user_id}?days=3
```

Generate recipes using expiring ingredients.

**Response:**
```json
{
  "recipes": [
    {
      "name": "Quick Breakfast Scramble",
      "ingredients": ["eggs", "milk", "cheese"],
      "instructions": ["Beat eggs...", "Cook..."],
      "prep_time": "10 minutes",
      "items_used": ["eggs", "milk"]
    }
  ],
  "expiring_items_used": ["eggs", "milk", "cheese"],
  "message": "Here are 3 recipes using your expiring items!"
}
```

### Get Shopping List

```http
GET /api/shopping-list/{user_id}
```

Generate smart shopping suggestions.

### Get Statistics

```http
GET /api/stats/{user_id}
```

Get user's impact statistics.

**Response:**
```json
{
  "total_items_tracked": 45,
  "items_saved": 38,
  "items_wasted": 7,
  "money_saved": 114.00,
  "pounds_saved": 19.00,
  "co2_saved": 15.20
}
```

### Update Item Status

```http
PUT /api/items/{item_id}/status
```

Mark item as consumed, wasted, or active.

## 🧪 Testing

### Test with cURL

```bash
# Health check
curl http://localhost:8000/health

# Upload image
curl -X POST http://localhost:8000/api/scan \
  -F "file=@test_image.jpg" \
  -F "user_id=test_user"

# Get expiring items
curl http://localhost:8000/api/expiring-items/test_user?days=3
```

### Test with Interactive Docs

Visit **http://localhost:8000/docs** for Swagger UI where you can test all endpoints interactively!

### Test Images

Create a folder `test_images/` and add some sample fridge photos to test with.

## 🌐 Deployment to DigitalOcean

### Using App Platform (Easiest)

1. Push your code to GitHub
2. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
3. Click "Create App" → Select your GitHub repo
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `uvicorn main:app --host 0.0.0.0 --port 8080`
5. Add environment variables in the settings:
   - `MONGODB_URL`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` (your deployed frontend URL)
6. Deploy!

### Using Droplet (More Control)

```bash
# SSH into droplet
ssh root@your_droplet_ip

# Install Python and dependencies
apt update
apt install python3 python3-pip python3-venv -y

# Clone your repo
git clone YOUR_REPO_URL
cd YOUR_REPO/server

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file with your credentials
nano .env

# Run with gunicorn
pip install gunicorn
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🐛 Troubleshooting

### Issue: "No module named 'torch'"

PyTorch installation failed. Try:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Issue: "Cannot connect to MongoDB"

- Check your MongoDB URL in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas (Network Access)
- Verify username/password are correct

### Issue: "Gemini API key invalid"

- Get a new key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Ensure there are no extra spaces in `.env`

### Issue: "YOLO model downloading slowly"

- The first run downloads the YOLOv8 model (~6MB)
- Wait for it to complete, then it's cached locally
- Or download manually from [Ultralytics](https://github.com/ultralytics/assets/releases)

### Issue: "Out of memory"

- Use a smaller YOLO model: `yolov8n.pt` (nano) instead of `yolov8m.pt` (medium)
- Reduce image size before processing
- Use fewer OCR languages

### Issue: "Port 8000 already in use"

Change the port in `.env`:
```env
PORT=8080
```

## 📝 Development Tips

### Enable Debug Mode

In `main.py`, the server runs with `reload=True` for development. This auto-restarts when you change code.

### View Logs

The server prints helpful logs:
- ✅ Success (green checkmark)
- ⚠️  Warning (yellow)
- ❌ Error (red X)
- 🔍 Detection info
- 📸 Processing info

### Database Queries

Use MongoDB Compass or the Atlas web interface to view your data directly.

### API Documentation

FastAPI auto-generates documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🎯 Next Steps

1. **Test Locally**: Upload test images and verify detection works
2. **Connect Frontend**: Update your React app to call these endpoints
3. **Improve Accuracy**: Fine-tune YOLO on food-specific dataset
4. **Add Authentication**: Implement user login/registration
5. **Optimize Performance**: Add caching, batch processing
6. **Deploy**: Push to DigitalOcean or other hosting

## 🤝 Integration with Frontend

Your React frontend should call these endpoints:

```javascript
// Example: Upload image
const formData = new FormData();
formData.append('file', imageFile);
formData.append('user_id', 'user123');

const response = await fetch('http://localhost:8000/api/scan', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.items_detected);
```

## 🆘 Need Help?

- Check the `/docs` endpoint for interactive API testing
- Read error messages carefully - they usually explain the problem
- Verify all environment variables are set correctly
- Ensure MongoDB and Gemini API are accessible
- Check that all dependencies installed successfully

## 📄 License

Built for Tidal Hackathon 2026 🏆

---

**Good luck with your hackathon! 🚀**

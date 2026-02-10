# 🎓 Beginner's Setup Guide for FridgeTrack Backend

**Complete step-by-step guide for someone who's never used FastAPI, MongoDB, or Python APIs before.**

## ⏱️ Estimated Time: 30-45 minutes

---

## Step 1: Install Python (5 minutes)

### Check if you have Python

Open a terminal/command prompt and run:

```bash
python --version
```

If you see `Python 3.10` or higher, you're good! Skip to Step 2.

### Install Python (if needed)

1. Go to [python.org/downloads](https://www.python.org/downloads/)
2. Download Python 3.10 or newer
3. **IMPORTANT**: Check "Add Python to PATH" during installation!
4. Restart your terminal/command prompt
5. Verify: `python --version`

---

## Step 2: Set Up MongoDB Atlas (10 minutes)

MongoDB is your database in the cloud (like Google Drive for your app's data).

### Create Account

1. Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up (it's free!)
3. Choose **"Build a Database"**
4. Select **M0 (FREE)** option
5. Choose a cloud provider (any works)
6. Name your cluster: `FridgeTrack`
7. Click **"Create"** (takes 3-5 minutes to deploy)

### Get Connection String

1. Click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (looks like: `mongodb+srv://...`)
4. **IMPORTANT**: Replace `<password>` with your actual password!

Your connection string should look like:
```
mongodb+srv://myusername:mypassword123@fridgetrack.abc123.mongodb.net/
```

### Whitelist Your IP (Important!)

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
4. Click **"Confirm"**

---

## Step 3: Get Gemini API Key (5 minutes)

Gemini is Google's AI that generates recipes and helps with detection.

1. Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AI...`)
5. Keep it safe - you'll need it in a moment!

---

## Step 4: Set Up Your Project (10 minutes)

### Open Terminal in Server Folder

**Windows:**
1. Navigate to `2026-Tidal-Hack/server` folder in File Explorer
2. Type `cmd` in the address bar and press Enter

**Mac/Linux:**
1. Open Terminal
2. Run: `cd path/to/2026-Tidal-Hack/server`

### Create Virtual Environment

This keeps your project dependencies isolated (like a container for Python packages).

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

You should see `(venv)` appear in your terminal prompt. This means it's active!

### Install Dependencies

```bash
pip install -r requirements.txt
```

**What's happening?** This installs all the Python libraries you need:
- FastAPI (web server)
- MongoDB driver
- YOLO (AI for detecting objects)
- EasyOCR (reading text from images)
- Gemini (Google's AI)

**Note**: This takes 5-10 minutes and downloads ~2GB. Get a coffee! ☕

### Create .env File

This file stores your secret keys (like passwords).

**Windows:**
```bash
copy .env.example .env
notepad .env
```

**Mac/Linux:**
```bash
cp .env.example .env
nano .env
```

Edit the file to add your actual values:

```env
# Replace these with YOUR actual values!
MONGODB_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/
DATABASE_NAME=fridgetrack
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
FRONTEND_URL=http://localhost:5173
```

**Example of filled-in .env:**
```env
MONGODB_URL=mongodb+srv://tejas:mypass123@fridgetrack.abc.mongodb.net/
DATABASE_NAME=fridgetrack
GEMINI_API_KEY=AIzaSyAbc123def456...
FRONTEND_URL=http://localhost:5173
```

Save and close the file.

---

## Step 5: Run Your Backend! (2 minutes)

```bash
python main.py
```

You should see:

```
🚀 Starting FridgeTrack API on 0.0.0.0:8000
✅ Connected to MongoDB: fridgetrack
✅ Loaded YOLO model: yolov8n.pt
✅ Initialized EasyOCR with languages: ['en']
✅ Initialized Gemini AI
📚 Documentation available at: http://localhost:8000/docs
```

**🎉 Congratulations! Your backend is running!**

---

## Step 6: Test Your API (5 minutes)

### Open Interactive Documentation

Go to: **http://localhost:8000/docs**

You should see a beautiful interactive API documentation page (Swagger UI).

### Test Health Check

1. Click on **GET /health**
2. Click **"Try it out"**
3. Click **"Execute"**

You should see a green response with status "healthy"!

### Test Image Scan (The Fun Part!)

1. Find a photo of food (or your fridge) on your computer
2. In the docs, click **POST /api/scan**
3. Click **"Try it out"**
4. Upload your image file
5. Enter a user_id (e.g., "test_user")
6. Click **"Execute"**

**What happens:**
- Image gets uploaded
- YOLO AI detects objects
- OCR reads expiration dates
- Results saved to MongoDB
- You get back detected items!

---

## 🎯 Understanding What You Built

### What is FastAPI?

FastAPI is a web framework that creates an API (a way for programs to talk to each other). Think of it like a waiter in a restaurant:
- Your frontend (React) is the customer
- Your backend (FastAPI) is the waiter
- Your database (MongoDB) is the kitchen

The customer asks the waiter for food → waiter gets it from the kitchen → brings it back.

### What are the endpoints?

Endpoints are like different menu items:

- `POST /api/scan` - "Please analyze this fridge photo"
- `GET /api/expiring-items/{user_id}` - "Show me what's expiring"
- `GET /api/recipes/{user_id}` - "Give me recipe ideas"

### How does the AI work?

1. **YOLO** looks at the image and draws boxes around objects
2. **EasyOCR** reads text from those boxes (expiration dates)
3. **Gemini** generates recipes and helps with uncertain detections

### Where is data stored?

Everything goes to MongoDB in "collections" (like folders):
- `inventory_items` - All detected food items
- `scans` - History of when you scanned your fridge
- `users` - User account info (if you add authentication)

---

## 🐛 Common Problems & Solutions

### "pip is not recognized"

Python wasn't added to PATH. Reinstall Python and check "Add to PATH".

### "Cannot connect to MongoDB"

1. Check your `.env` file - is the URL correct?
2. Did you replace `<password>` with your actual password?
3. Did you whitelist your IP in MongoDB Atlas?

### "ModuleNotFoundError"

Virtual environment not activated or dependencies not installed.

**Fix:**
```bash
# Activate venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt
```

### "Port 8000 already in use"

Something else is running on port 8000.

**Fix:** Add to `.env`:
```env
PORT=8080
```

Then run again.

### YOLO model downloading slowly

The first time you run, it downloads the AI model (~6MB). This is normal! Future runs will be instant.

---

## 🔄 Daily Workflow

Every time you work on the project:

1. Open terminal in server folder
2. Activate virtual environment:
   ```bash
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Mac/Linux
   ```
3. Run server:
   ```bash
   python main.py
   ```
4. Code away! The server auto-reloads when you save changes.
5. When done, press `Ctrl+C` to stop the server

---

## 📚 Key Concepts to Understand

### Async/Await

You'll see `async` and `await` in the code. This lets Python handle multiple requests at once (like a restaurant with multiple waiters, not just one).

```python
async def get_recipes(user_id: str):
    items = await db.inventory_items.find(...)
```

### Models (Pydantic)

These define the "shape" of your data:

```python
class InventoryItem(BaseModel):
    user_id: str
    item_name: str
    expiration_date: Optional[datetime] = None
```

This ensures data is always structured correctly.

### Database Operations

```python
# Insert
await db.inventory_items.insert_one(item)

# Find
items = await db.inventory_items.find({"user_id": "user123"})

# Update
await db.inventory_items.update_one({"_id": id}, {"$set": {"status": "consumed"}})
```

### File Uploads

```python
@app.post("/api/scan")
async def scan_fridge(file: UploadFile = File(...)):
    # File is automatically parsed from form data
```

---

## 🚀 Next Steps

### Connect Your Frontend

In your React app, call the backend:

```javascript
const response = await fetch('http://localhost:8000/api/scan', {
  method: 'POST',
  body: formData
});
const data = await response.json();
```

### Add More Features

Ideas to extend:
- User authentication (login/signup)
- Email notifications for expiring items
- Barcode scanning
- Voice commands
- Mobile app

### Deploy to Production

When ready to show the world:
1. Push code to GitHub
2. Deploy to DigitalOcean App Platform ($5/month)
3. Update CORS to allow your deployed frontend URL

---

## 🆘 Getting Help

1. **Read error messages** - They usually tell you exactly what's wrong!
2. **Check the logs** - The server prints helpful messages
3. **Use /docs** - Test endpoints interactively
4. **Google the error** - Someone else has probably had the same issue
5. **Ask your teammates** - Collaboration is key!

---

## 🎓 Learning Resources

Want to understand more?

- **FastAPI Tutorial**: [fastapi.tiangolo.com/tutorial](https://fastapi.tiangolo.com/tutorial/)
- **MongoDB University**: [university.mongodb.com](https://university.mongodb.com) (Free courses!)
- **Python Crash Course**: [youtube.com/watch?v=rfscVS0vtbw](https://www.youtube.com/watch?v=rfscVS0vtbw)

---

**You've got this! 💪 Good luck at the hackathon! 🏆**

Remember: Everyone starts as a beginner. The fact that you're building this is already impressive!

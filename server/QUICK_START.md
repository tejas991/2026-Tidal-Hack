# ⚡ FridgeTrack Backend - Quick Start

**Get your backend running in 3 commands!**

---

## 🎯 For Complete Beginners

### Step 1: Install Dependencies (5 minutes)

```bash
# Windows
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Set Up Environment (2 minutes)

1. Copy `.env.example` to `.env`
2. Add your MongoDB URL (get from [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))
3. Add your Gemini API key (get from [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey))

### Step 3: Run! (1 second)

```bash
python main.py
```

Visit: **http://localhost:8000/docs** 🎉

---

## 📁 Files You Created

✅ **main.py** - FastAPI server with all endpoints
✅ **database.py** - MongoDB connection
✅ **models.py** - Data structures
✅ **utils/food_detector.py** - YOLO AI for food detection
✅ **utils/date_extractor.py** - OCR for expiration dates
✅ **utils/gemini_helper.py** - Recipe generation
✅ **requirements.txt** - Dependencies

---

## 🎯 Key Endpoints

| Endpoint | What it does |
|----------|--------------|
| `POST /api/scan` | Upload fridge photo, get detected items |
| `GET /api/expiring-items/{user_id}` | Get items expiring soon |
| `GET /api/recipes/{user_id}` | Generate recipes from expiring items |
| `GET /api/shopping-list/{user_id}` | Smart shopping suggestions |
| `GET /api/stats/{user_id}` | Your impact (money saved, CO2 reduced) |

---

## 📚 Documentation

- **README.md** - Full documentation
- **SETUP_GUIDE.md** - Beginner's step-by-step guide
- **API_REFERENCE.md** - All endpoints with examples
- **ARCHITECTURE.md** - How everything works
- **test_api.py** - Test script

---

## 🧪 Testing Your API

```bash
# Run test script
python test_api.py

# Or visit interactive docs
# http://localhost:8000/docs
```

---

## 🔧 Troubleshooting

**Problem**: Can't connect to MongoDB
**Solution**: Check your `.env` file has correct `MONGODB_URL`

**Problem**: "No module named 'fastapi'"
**Solution**: Activate virtual environment first:
```bash
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
```

**Problem**: "Port 8000 already in use"
**Solution**: Add `PORT=8080` to `.env` file

---

## 🚀 Next Steps

1. ✅ Test with sample images at `/docs`
2. ✅ Connect your React frontend
3. ✅ Deploy to DigitalOcean
4. ✅ Win the hackathon! 🏆

---

**Need Help?** Read SETUP_GUIDE.md for detailed instructions.

**Good luck! You've got this! 💪**

# 📖 FridgeTrack API Quick Reference

**Quick cheat sheet for all endpoints**

Base URL: `http://localhost:8000`

---

## 🏥 Health & Status

### Check API Health
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "components": {
    "food_detector": "loaded",
    "date_extractor": "loaded",
    "gemini": "loaded"
  }
}
```

---

## 📸 Image Scanning

### Scan Fridge Image
```http
POST /api/scan
Content-Type: multipart/form-data
```

**Parameters:**
- `file` (file): Image file
- `user_id` (string): User identifier

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/scan \
  -F "file=@fridge_photo.jpg" \
  -F "user_id=user123"
```

**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('user_id', 'user123');

const response = await fetch('http://localhost:8000/api/scan', {
  method: 'POST',
  body: formData
});

const data = await response.json();
```

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

---

## 📦 Inventory Management

### Get User Inventory
```http
GET /api/inventory/{user_id}?status=active
```

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `consumed`, `wasted`)

**Example:**
```bash
curl http://localhost:8000/api/inventory/user123?status=active
```

**Response:**
```json
{
  "user_id": "user123",
  "items": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "user_id": "user123",
      "item_name": "milk",
      "expiration_date": "2025-02-15T00:00:00",
      "detected_at": "2025-02-07T10:30:00",
      "confidence_score": 0.89,
      "status": "active",
      "quantity": 1
    }
  ],
  "total": 15
}
```

---

## ⏰ Expiration Tracking

### Get Expiring Items
```http
GET /api/expiring-items/{user_id}?days=3
```

**Query Parameters:**
- `days` (optional): Look ahead this many days (default: 3)

**Example:**
```bash
curl http://localhost:8000/api/expiring-items/user123?days=7
```

**Response:**
```json
{
  "user_id": "user123",
  "expiring_items": [
    {
      "item_name": "yogurt",
      "expiration_date": "2025-02-08T00:00:00",
      "days_left": 1,
      "confidence_score": 0.92
    }
  ],
  "total_expiring": 8,
  "urgency_breakdown": {
    "today": 2,
    "tomorrow": 3,
    "this_week": 3
  }
}
```

---

## 🍳 Recipe Generation

### Generate Recipes from Expiring Items
```http
GET /api/recipes/{user_id}?days=3
```

**Query Parameters:**
- `days` (optional): Use items expiring within this many days (default: 3)

**Example:**
```bash
curl http://localhost:8000/api/recipes/user123
```

**Response:**
```json
{
  "recipes": [
    {
      "name": "Quick Breakfast Scramble",
      "ingredients": [
        "2 eggs",
        "1/4 cup milk",
        "2 slices bread",
        "Salt and pepper"
      ],
      "instructions": [
        "Beat eggs with milk in a bowl",
        "Heat pan over medium heat with butter",
        "Pour egg mixture and gently scramble",
        "Serve with toasted bread"
      ],
      "prep_time": "10 minutes",
      "items_used": ["eggs", "milk", "bread"]
    }
  ],
  "expiring_items_used": ["eggs", "milk", "bread", "yogurt"],
  "message": "Here are 3 recipes using your expiring items!"
}
```

---

## 🛒 Shopping List

### Get Smart Shopping Suggestions
```http
GET /api/shopping-list/{user_id}
```

**Example:**
```bash
curl http://localhost:8000/api/shopping-list/user123
```

**Response:**
```json
{
  "user_id": "user123",
  "shopping_items": [
    {
      "item_name": "milk",
      "reason": "You buy this weekly but don't have any",
      "priority": 5,
      "frequency": 3
    },
    {
      "item_name": "eggs",
      "reason": "Common staple, frequently purchased",
      "priority": 4,
      "frequency": 2
    }
  ],
  "total_items": 8,
  "generated_at": "2025-02-07T10:30:00"
}
```

---

## 📊 Statistics & Impact

### Get User Statistics
```http
GET /api/stats/{user_id}
```

**Example:**
```bash
curl http://localhost:8000/api/stats/user123
```

**Response:**
```json
{
  "total_items_tracked": 156,
  "items_saved": 142,
  "items_wasted": 14,
  "money_saved": 426.00,
  "pounds_saved": 71.00,
  "co2_saved": 56.80
}
```

**Calculation Notes:**
- `money_saved` = items_saved × $3 (avg item cost)
- `pounds_saved` = items_saved × 0.5 lbs (avg item weight)
- `co2_saved` = pounds_saved × 0.8 kg CO2/lb

---

## ✏️ Item Updates

### Update Item Status
```http
PUT /api/items/{item_id}/status
Content-Type: application/x-www-form-urlencoded
```

**Parameters:**
- `status` (string): New status (`active`, `consumed`, `wasted`)

**Example:**
```bash
curl -X PUT http://localhost:8000/api/items/507f1f77bcf86cd799439011/status \
  -d "status=consumed"
```

**Response:**
```json
{
  "message": "Item status updated to consumed",
  "item_id": "507f1f77bcf86cd799439011"
}
```

---

## 🔐 Frontend Integration Examples

### React Component Example

```jsx
import { useState } from 'react';

function FridgeScanner() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', 'user123');

    try {
      const response = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleScan} />
      {loading && <p>Scanning...</p>}
      {results && (
        <div>
          <h2>Found {results.total_items} items!</h2>
          {results.items_detected.map((item, i) => (
            <div key={i}>
              <p>{item.item_name} - {item.confidence}% confidence</p>
              {item.expiration_date && (
                <p>Expires: {item.expiration_date}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Fetch Expiring Items

```javascript
async function getExpiringItems(userId) {
  const response = await fetch(
    `http://localhost:8000/api/expiring-items/${userId}?days=3`
  );
  const data = await response.json();

  return data.expiring_items;
}
```

### Generate Recipes

```javascript
async function getRecipes(userId) {
  const response = await fetch(
    `http://localhost:8000/api/recipes/${userId}?days=7`
  );
  const data = await response.json();

  return data.recipes;
}
```

---

## 🚨 Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "detail": "No items detected. Try getting closer or improving lighting."
}
```

### 404 Not Found
```json
{
  "detail": "Item not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Scan failed: [error message]"
}
```

---

## 🧪 Testing Tips

### Using cURL

```bash
# Test health
curl http://localhost:8000/health

# Upload image (replace with your file path)
curl -X POST http://localhost:8000/api/scan \
  -F "file=@/path/to/image.jpg" \
  -F "user_id=test_user"

# Get expiring items
curl http://localhost:8000/api/expiring-items/test_user?days=7

# Get recipes
curl http://localhost:8000/api/recipes/test_user

# Get stats
curl http://localhost:8000/api/stats/test_user
```

### Using Postman

1. Create new request
2. Set method and URL
3. For file uploads:
   - Body → form-data
   - Key: `file` (type: File)
   - Key: `user_id` (type: Text)
4. Send request

### Using Python

```python
import requests

# Upload image
with open('fridge.jpg', 'rb') as f:
    files = {'file': f}
    data = {'user_id': 'test_user'}
    response = requests.post(
        'http://localhost:8000/api/scan',
        files=files,
        data=data
    )
    print(response.json())
```

---

## 📝 Common Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `user_id` | string | required | User identifier |
| `status` | string | "active" | Item status filter |
| `days` | integer | 3 | Days to look ahead |

---

## 🎯 Status Values

Items can have three statuses:

- **`active`**: Currently in inventory
- **`consumed`**: Used before expiring
- **`wasted`**: Thrown away after expiring

---

**Interactive Documentation**: Visit `http://localhost:8000/docs` for a web-based API explorer!

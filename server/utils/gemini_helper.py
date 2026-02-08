"""
Gemini AI integration for recipe generation and food identification
This module uses Google's Gemini API for intelligent features
"""
import google.generativeai as genai
import os
import json
import re
from typing import List, Optional
from datetime import datetime, timedelta
from PIL import Image


class GeminiHelper:
    """Helper class for Gemini AI operations"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini AI

        Args:
            api_key: Gemini API key (or use GEMINI_API_KEY env variable)
        """
        api_key = api_key or os.getenv("GEMINI_API_KEY")

        if not api_key:
            print("⚠️  Warning: GEMINI_API_KEY not found. Gemini features will not work.")
            self.model = None
            return

        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            print("✅ Initialized Gemini AI")
        except Exception as e:
            print(f"❌ Error initializing Gemini: {e}")
            self.model = None

    def detect_all_food_items(self, image_path: str) -> List[dict]:
        """
        Detect all food items in a fridge image using Gemini Vision.

        Args:
            image_path: Path to the fridge image

        Returns:
            List of dicts with item_name, confidence, bounding_box
        """
        if not self.model:
            return []

        try:
            img = Image.open(image_path)
            w, h = img.size

            prompt = """Look at this fridge/food image and identify ALL food items you can see.

For each item, provide:
- "item_name": the food name (1-3 words, lowercase)
- "confidence": how confident you are (0.0 to 1.0)

Respond with ONLY a JSON array, no other text:
[{"item_name": "milk", "confidence": 0.95}, {"item_name": "apple", "confidence": 0.9}]

If no food items are found, respond with: []"""

            response = self.model.generate_content([prompt, img])
            response_text = response.text.strip()

            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            items = json.loads(response_text)

            # Add placeholder bounding boxes spread across the image
            detections = []
            count = len(items)
            for i, item in enumerate(items):
                box_w = w // max(count, 1)
                x1 = i * box_w
                y1 = 0
                x2 = min(x1 + box_w, w)
                y2 = h
                detections.append({
                    "item_name": item.get("item_name", "unknown"),
                    "confidence": round(float(item.get("confidence", 0.8)), 3),
                    "bounding_box": [x1, y1, x2, y2],
                })

            print(f"🔍 Gemini detected {len(detections)} food items")
            return detections

        except Exception as e:
            print(f"❌ Error detecting food with Gemini: {e}")
            return []

    def identify_food_item(self, image_path: str) -> Optional[str]:
        """
        Identify a food item from an image (fallback for low-confidence YOLO detections)

        Args:
            image_path: Path to the food image

        Returns:
            Food item name or None
        """
        if not self.model:
            return None

        try:
            img = Image.open(image_path)

            prompt = """
            Identify the food item in this image.
            Respond with ONLY the name of the food item in 1-3 words, nothing else.
            If you cannot identify food, respond with "unknown".
            """

            response = self.model.generate_content([prompt, img])
            food_name = response.text.strip().lower()

            return food_name if food_name != "unknown" else None

        except Exception as e:
            print(f"❌ Error identifying food with Gemini: {e}")
            return None

    def extract_expiration_date(self, image_path: str) -> Optional[str]:
        """
        Extract expiration date from image (fallback for OCR failure)

        Args:
            image_path: Path to the image

        Returns:
            Date string in format MM/DD/YYYY or None
        """
        if not self.model:
            return None

        try:
            img = Image.open(image_path)

            prompt = """
            Look for an expiration date, best by date, or use by date in this image.
            Respond with ONLY the date in format MM/DD/YYYY.
            If no date is found, respond with "NO DATE FOUND".
            """

            response = self.model.generate_content([prompt, img])
            date_text = response.text.strip()

            return date_text if "NO DATE" not in date_text else None

        except Exception as e:
            print(f"❌ Error extracting date with Gemini: {e}")
            return None

    def estimate_expiration(self, item_name: str) -> Optional[str]:
        """
        Estimate average expiration date for a food item using Gemini AI.
        Works for all food types including fruits, vegetables, dairy, meat, etc.
        Used as fallback when OCR and image-based date extraction fail.

        Args:
            item_name: Name of the food item (e.g. "apple", "milk", "chicken")

        Returns:
            Date string in ISO format (YYYY-MM-DD) or None
        """
        if not self.model:
            return self._fallback_expiration(item_name)

        try:
            prompt = f"""
            How many days does "{item_name}" typically last when stored in a refrigerator
            after being purchased from a grocery store?
            Consider average freshness from the date of purchase.
            Respond with ONLY a single integer number of days. Nothing else.
            """

            response = self.model.generate_content(prompt)
            days_text = response.text.strip()

            days = int(re.search(r'\d+', days_text).group())

            expiration = datetime.utcnow() + timedelta(days=days)
            result = expiration.strftime("%Y-%m-%d")

            print(f"📅 AI estimated expiry for '{item_name}': {days} days → {result}")
            return result

        except Exception as e:
            print(f"❌ Error estimating expiry with Gemini: {e}")
            return self._fallback_expiration(item_name)

    def _fallback_expiration(self, item_name: str) -> Optional[str]:
        """Hardcoded average shelf life estimates when Gemini is unavailable.
        Covers fruits, vegetables, dairy, meat, and common pantry items."""

        shelf_life = {
            # Fruits
            "apple": 21, "banana": 5, "blue berry": 7, "blueberry": 7,
            "stawberry": 5, "strawberry": 5, "orange": 21, "grape": 7,
            "grapes": 7, "mango": 5, "pear": 5, "peach": 4, "plum": 5,
            "watermelon": 7, "pineapple": 5, "kiwi": 7, "avocado": 4,
            "lemon": 21, "lime": 21, "cherry": 5, "fig": 3,
            "pomegranate": 14, "papaya": 5, "cantaloupe": 5,
            # Vegetables
            "brinjal": 7, "cabbage": 14, "capsicum": 7, "carrot": 21,
            "corn": 3, "cucumber": 7, "green beans": 5, "green chilly": 7,
            "green leaves": 3, "mushroom": 5, "potato": 21, "sweet potato": 14,
            "tomato": 7, "onion": 30, "garlic": 30, "spinach": 3,
            "lettuce": 5, "broccoli": 5, "cauliflower": 7, "celery": 14,
            "zucchini": 5, "bell pepper": 7, "ginger": 21, "peas": 3,
            # Dairy
            "milk": 7, "cheese": 21, "butter": 30, "yogurt": 10,
            "fresh cream": 7, "cream cheese": 14, "sour cream": 14,
            # Meat & Protein
            "chicken": 2, "meat": 3, "beef": 3, "pork": 3,
            "shrimp": 2, "fish": 2, "turkey": 2, "egg": 21, "eggs": 21,
            "tofu": 7, "sausage": 5, "bacon": 7, "ham": 5,
            # Pantry & Other
            "bread": 5, "chocolate": 180, "flour": 180, "rice": 180,
            "pasta": 180, "jam": 90, "juice": 7, "sauce": 14,
            "ketchup": 30, "mustard": 60, "mayonnaise": 60,
        }

        days = shelf_life.get(item_name.lower(), 7)  # Default 7 days
        expiration = datetime.utcnow() + timedelta(days=days)
        result = expiration.strftime("%Y-%m-%d")
        print(f"📅 [FALLBACK] Estimated expiry for '{item_name}': {days} days → {result}")
        return result

    def generate_recipes(self, expiring_items: List[str], max_recipes: int = 3) -> List[dict]:
        """
        Generate recipes using expiring ingredients

        Args:
            expiring_items: List of food items that are expiring soon
            max_recipes: Number of recipes to generate

        Returns:
            List of recipe dictionaries
        """
        if not self.model or not expiring_items:
            return []

        try:
            items_str = ", ".join(expiring_items)

            prompt = f"""
            I have these ingredients expiring soon: {items_str}

            Generate {max_recipes} quick and easy recipes using these items.
            For each recipe, provide:
            1. Recipe name
            2. List of ingredients with amounts
            3. Step-by-step instructions (3-5 steps max)
            4. Estimated prep time

            Format your response as a JSON array like this:
            [
              {{
                "name": "Recipe Name",
                "ingredients": ["ingredient 1", "ingredient 2"],
                "instructions": ["step 1", "step 2", "step 3"],
                "prep_time": "20 minutes",
                "items_used": ["item1", "item2"]
              }}
            ]

            Keep recipes simple and practical. Focus on using the expiring items.
            """

            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Extract JSON from response (sometimes it's wrapped in markdown)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            recipes = json.loads(response_text)

            # Ensure items_used is populated
            for recipe in recipes:
                if "items_used" not in recipe:
                    recipe["items_used"] = [item for item in expiring_items
                                          if item.lower() in str(recipe).lower()]

            print(f"🍳 Generated {len(recipes)} recipes")
            return recipes

        except Exception as e:
            print(f"❌ Error generating recipes: {e}")
            # Fallback: return simple recipes
            return self._generate_fallback_recipes(expiring_items)

    def _generate_fallback_recipes(self, items: List[str]) -> List[dict]:
        """Provide simple fallback recipes if Gemini fails"""
        fallback_recipes = []

        # Simple generic recipes
        if any(item in ['eggs', 'egg', 'milk', 'bread'] for item in items):
            fallback_recipes.append({
                "name": "Quick Breakfast Scramble",
                "ingredients": ["eggs", "milk", "bread", "butter", "salt", "pepper"],
                "instructions": [
                    "Beat eggs with a splash of milk",
                    "Heat butter in a pan over medium heat",
                    "Pour in egg mixture and gently scramble",
                    "Serve with toasted bread"
                ],
                "prep_time": "10 minutes",
                "items_used": [item for item in items if item in ['eggs', 'egg', 'milk', 'bread']]
            })

        if any(item in ['yogurt', 'banana', 'berries', 'strawberry'] for item in items):
            fallback_recipes.append({
                "name": "Fruit Smoothie",
                "ingredients": ["yogurt", "banana", "berries", "honey"],
                "instructions": [
                    "Add all ingredients to a blender",
                    "Blend until smooth",
                    "Pour into a glass and enjoy"
                ],
                "prep_time": "5 minutes",
                "items_used": [item for item in items if item in ['yogurt', 'banana', 'berries']]
            })

        return fallback_recipes[:3]

    def generate_shopping_suggestions(self, inventory_items: List[str],
                                     scan_history: List[dict]) -> List[dict]:
        """
        Generate smart shopping list suggestions based on consumption patterns

        Args:
            inventory_items: Current items in inventory
            scan_history: Historical scan data

        Returns:
            List of suggested shopping items with reasons
        """
        if not self.model:
            return []

        try:
            prompt = f"""
            Based on this user's fridge inventory and history, suggest items they should buy:

            Current inventory: {", ".join(inventory_items) if inventory_items else "empty"}
            Recent purchases (from scan history): {", ".join([item.get('item_name', '') for scan in scan_history for item in scan.get('items', [])])}

            Generate a shopping list of 5-10 items they likely need.
            Consider:
            - Items they frequently buy but don't currently have
            - Common staples that are missing
            - Complementary items to what they have

            Format as JSON array:
            [
              {{
                "item_name": "milk",
                "reason": "You buy this weekly but don't have any",
                "priority": 5
              }}
            ]

            Priority: 1 (low) to 5 (high)
            """

            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Extract JSON
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            suggestions = json.loads(response_text)
            return suggestions

        except Exception as e:
            print(f"❌ Error generating shopping suggestions: {e}")
            return []

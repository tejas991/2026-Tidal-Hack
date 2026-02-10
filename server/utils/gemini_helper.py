"""
Gemini AI integration for recipe generation and food identification
This module uses Google's Gemini API for intelligent features
"""
import google.generativeai as genai
import os
import json
from typing import List, Optional
from PIL import Image


class GeminiHelper:
    """Helper class for Google Gemini AI integration.

    This class handles all interactions with Google's Gemini AI model, which provides
    advanced features like food identification, date extraction fallback, recipe generation,
    and shopping list suggestions. Gemini is a large language model with vision capabilities,
    making it perfect for understanding both images and text.

    Gemini serves multiple roles in FridgeTrack:
    1. Fallback food identification when YOLO has low confidence
    2. Fallback date extraction when OCR fails
    3. Recipe generation using expiring ingredients
    4. Intelligent shopping list suggestions

    Attributes:
        model (genai.GenerativeModel or None): The Gemini model instance, or None if
            initialization failed

    Example:
        >>> helper = GeminiHelper()
        >>> recipes = helper.generate_recipes(["banana", "yogurt", "honey"])
        >>> print(f"Generated {len(recipes)} recipes")
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the Gemini AI client with API credentials.

        This constructor sets up the connection to Google's Gemini API. You need a valid
        API key from Google AI Studio (https://makersuite.google.com/app/apikey).

        The Gemini 1.5 Flash model is used because it's:
        - Fast (good for real-time applications)
        - Affordable (lower cost per request)
        - Capable (handles both text and images)
        - Sufficient for our use cases

        Args:
            api_key (str, optional): Your Gemini API key. If not provided, the key is
                read from the GEMINI_API_KEY environment variable. Defaults to None.

        Example:
            Using environment variable (recommended):
            >>> # In .env file: GEMINI_API_KEY=your_key_here
            >>> helper = GeminiHelper()

            Passing key directly:
            >>> helper = GeminiHelper(api_key="your_api_key_here")

            Graceful degradation if no key:
            >>> helper = GeminiHelper()  # No key provided
            ⚠️  Warning: GEMINI_API_KEY not found. Gemini features will not work.
            >>> # App still works but uses fallback features

        Note:
            - Get a free API key at https://makersuite.google.com/app/apikey
            - If no key is provided, model is set to None and methods return empty results
            - The app continues to function without Gemini, using fallback mechanisms
            - Free tier has usage limits (check Google AI Studio for current limits)
        """
        api_key = api_key or os.getenv("GEMINI_API_KEY")

        if not api_key:
            print("⚠️  Warning: GEMINI_API_KEY not found. Gemini features will not work.")
            self.model = None
            return

        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            print("✅ Initialized Gemini AI")
        except Exception as e:
            print(f"❌ Error initializing Gemini: {e}")
            self.model = None

    def identify_food_item(self, image_path: str) -> Optional[str]:
        """Identify a food item from an image using AI vision.

        This method is used as a fallback when YOLO object detection has low confidence
        or doesn't recognize an item. Gemini's vision capabilities can identify a wider
        variety of food items, including prepared foods, unusual items, or items in
        non-standard packaging.

        The AI analyzes the image and returns a simple, concise name for the food item.
        This is particularly useful for:
        - Items YOLO doesn't recognize (custom foods, international items)
        - Partially visible items
        - Prepared foods or leftovers
        - Items in unusual containers

        Args:
            image_path (str): Path to the image file containing the food item. Works
                best with cropped images showing just one item clearly.

        Returns:
            str or None: The name of the food item in 1-3 words (lowercase), or None if:
                - Gemini is not initialized (no API key)
                - The AI cannot identify food in the image
                - An error occurs during processing

        Example:
            >>> helper = GeminiHelper()
            >>> # Identify an item YOLO missed
            >>> food = helper.identify_food_item("unknown_item.jpg")
            >>> print(food)
            "sushi roll"

            >>> # Use in the scan pipeline
            >>> if detection['confidence'] < 0.5:
            ...     # YOLO not confident, ask Gemini
            ...     food = helper.identify_food_item(cropped_image_path)
            ...     if food:
            ...         detection['item_name'] = food
            ...         detection['confidence'] = 0.6  # Gemini fallback confidence

        Note:
            - Returns lowercase names for consistency with YOLO
            - Response is limited to 1-3 words as instructed in the prompt
            - Returns "unknown" as None (filtered out)
            - May incur API costs per request
            - Slower than YOLO but more versatile
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
        """Extract expiration date from an image using AI vision as an OCR fallback.

        This method is used when traditional OCR (EasyOCR) fails to find a date on
        food packaging. Gemini's vision AI can often read dates that OCR misses due to:
        - Unusual fonts or handwriting
        - Poor image quality or lighting
        - Rotated or curved text
        - Complex backgrounds

        The AI looks for expiration dates, "best by" dates, "use by" dates, or similar
        date markings on packaging.

        Args:
            image_path (str): Path to the image file, ideally a cropped region showing
                the food item's label or packaging.

        Returns:
            str or None: The expiration date in "MM/DD/YYYY" format, or None if:
                - Gemini is not initialized (no API key)
                - No date is found in the image
                - An error occurs during processing

        Example:
            >>> helper = GeminiHelper()
            >>> # Use after OCR fails
            >>> date = date_extractor.extract_date_from_image("item.jpg")
            >>> if not date:
            ...     # OCR failed, try Gemini
            ...     date = helper.extract_expiration_date("item.jpg")
            ...     print(f"Gemini found date: {date}")

            Output:
            Gemini found date: 02/15/2026

        Note:
            - Returns US format MM/DD/YYYY (different from ISO format used elsewhere)
            - May incur API costs per request
            - Slower than OCR but more robust for difficult cases
            - Returns None (not an error) if "NO DATE FOUND" is in response
            - Best used on cropped images of individual items
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

    def generate_recipes(self, expiring_items: List[str], max_recipes: int = 3) -> List[dict]:
        """Generate creative, practical recipes using ingredients that are expiring soon.

        This is one of the core features of FridgeTrack's food waste prevention strategy.
        The AI analyzes which items are about to expire and creates recipes that
        specifically incorporate those ingredients, encouraging users to consume them
        before they go bad.

        The recipes are designed to be:
        - Quick and easy (3-5 steps maximum)
        - Practical for home cooking
        - Focused on using the expiring items
        - Suitable for common skill levels

        Args:
            expiring_items (List[str]): List of food item names that are expiring within
                the user's specified time window (typically 3-7 days). For example:
                ["banana", "yogurt", "strawberry", "milk"]
            max_recipes (int, optional): Maximum number of recipes to generate. Defaults to 3.
                More recipes give more options but cost more API calls and take longer.

        Returns:
            List[dict]: List of recipe dictionaries. Each recipe contains:
                - name (str): Recipe title (e.g., "Berry Banana Smoothie")
                - ingredients (List[str]): Full ingredient list with amounts
                - instructions (List[str]): Step-by-step cooking instructions
                - prep_time (str): Estimated preparation time (e.g., "20 minutes")
                - items_used (List[str]): Which expiring items are used in this recipe

            Returns empty list [] if:
            - Gemini is not initialized (no API key)
            - No expiring items are provided
            - An error occurs (falls back to simple recipes if available)

        Example:
            >>> helper = GeminiHelper()
            >>> expiring = ["banana", "yogurt", "strawberry"]
            >>> recipes = helper.generate_recipes(expiring, max_recipes=2)
            >>>
            >>> for recipe in recipes:
            ...     print(f"\n{recipe['name']}")
            ...     print(f"Time: {recipe['prep_time']}")
            ...     print(f"Uses: {', '.join(recipe['items_used'])}")
            ...     print("\nIngredients:")
            ...     for ing in recipe['ingredients']:
            ...         print(f"  - {ing}")

            Output:
            Berry Banana Smoothie
            Time: 5 minutes
            Uses: banana, yogurt, strawberry

            Ingredients:
              - 2 ripe bananas
              - 1 cup yogurt
              - 1 cup strawberries
              - 1/2 cup ice
              - honey to taste

        Raises:
            No exceptions raised - errors are caught and logged, falling back to simple
            recipes if possible.

        Note:
            - Recipes are generated fresh each time (not pre-stored)
            - AI may suggest additional common ingredients (eggs, flour, etc.)
            - Focus is on using the expiring items, not necessarily using ALL of them
            - If Gemini fails, fallback recipes are provided for common items
            - API costs scale with number of recipes requested
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
        """Generate simple hardcoded recipes when Gemini AI is unavailable.

        This private method provides a safety net when Gemini cannot generate recipes
        (due to API errors, no API key, or other issues). It returns pre-defined,
        simple recipes for common ingredient combinations.

        This ensures the app continues to function even without Gemini, maintaining
        a good user experience. The fallback recipes are intentionally simple and use
        very common ingredients.

        Args:
            items (List[str]): List of available food items. The method checks if these
                items match any of the predefined recipe patterns.

        Returns:
            List[dict]: List of up to 3 simple recipe dictionaries in the same format
                as generate_recipes(). Each recipe includes:
                - name, ingredients, instructions, prep_time, items_used

            Returns empty list [] if no fallback recipes match the available items.

        Example:
            This is an internal method:
            >>> helper = GeminiHelper()
            >>> # Called internally when Gemini fails
            >>> recipes = helper._generate_fallback_recipes(["eggs", "milk", "bread"])
            >>> print(recipes[0]['name'])
            "Quick Breakfast Scramble"

        Note:
            - Private method (starts with _), not intended for direct use
            - Only covers very common ingredient combinations
            - Limited to 2 predefined recipes currently
            - Always returns at most 3 recipes
            - Recipes are family-friendly and beginner-level difficulty
        """
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
        """Generate intelligent shopping list suggestions based on user behavior patterns.

        This method uses AI to analyze a user's purchasing history and current inventory
        to suggest what they should buy. The AI looks for patterns like:
        - Items they frequently buy but currently don't have
        - Staple items that are missing
        - Complementary items (e.g., if they have pasta, suggest sauce)
        - Seasonal or health-conscious suggestions

        This helps users maintain their preferred inventory levels and reduces the
        mental load of planning grocery shopping.

        Args:
            inventory_items (List[str]): List of items currently in the user's fridge
                (status = "active"). For example: ["milk", "eggs", "yogurt"]
            scan_history (List[dict]): List of scan records from the past 30 days.
                Each scan record contains scan metadata and items detected. This helps
                the AI understand what the user typically buys.

        Returns:
            List[dict]: List of 5-10 suggested shopping items. Each suggestion contains:
                - item_name (str): Name of the suggested item (e.g., "milk")
                - reason (str): Explanation of why this item is suggested
                - priority (int): Importance level from 1 (low) to 5 (high)

            Returns empty list [] if:
            - Gemini is not initialized (no API key)
            - An error occurs during generation

        Example:
            >>> helper = GeminiHelper()
            >>> current = ["lettuce", "tomato", "cheese"]
            >>> history = [{"items": [{"item_name": "milk"}]}, ...]
            >>> suggestions = helper.generate_shopping_suggestions(current, history)
            >>>
            >>> for item in suggestions:
            ...     stars = "⭐" * item['priority']
            ...     print(f"{stars} {item['item_name']}")
            ...     print(f"   {item['reason']}\n")

            Output:
            ⭐⭐⭐⭐⭐ milk
               You buy this weekly but don't have any

            ⭐⭐⭐⭐ bread
               Frequently purchased in your history

            ⭐⭐⭐ salad dressing
               Complements your lettuce and tomatoes

        Note:
            - Analyzes last 30 days of history for patterns
            - Priority 5 = urgent/essential, Priority 1 = optional/nice-to-have
            - Suggestions are personalized based on individual habits
            - May incur API costs per request
            - If user has everything they need, suggestions may be minimal
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

"""
Food detection using custom Roboflow model
This module handles detecting food items in fridge images.
Falls back to mock detection when ROBOFLOW_API_KEY is not configured.
"""
import cv2
import numpy as np
import random
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()


# Mock food items returned when Roboflow is not available
# Items match the classes from dataset_yolo/data.yaml
MOCK_FOOD_ITEMS = [
    "apple", "banana", "blue berry", "bread", "brinjal",
    "butter", "cabbage", "capsicum", "carrot", "cheese",
    "chicken", "chocolate", "corn", "cucumber", "egg",
    "flour", "fresh cream", "ginger", "green beans", "green chilly",
    "green leaves", "lemon", "meat", "milk", "mushroom",
    "potato", "shrimp", "stawberry", "sweet potato", "tomato",
]


class FoodDetector:
    """Detect food items in images using a custom Roboflow model"""

    def __init__(self):
        self.model = None
        self.mock_mode = False

        api_key = os.getenv('ROBOFLOW_API_KEY')

        # Treat placeholder values as missing
        if not api_key or api_key in ('YOUR_KEY_HERE', 'your_roboflow_api_key_here'):
            print("⚠️  ROBOFLOW_API_KEY not set — using mock detection")
            self.mock_mode = True
            return

        import requests as _requests  # verify requests is available

        self.api_key = api_key
        self.workspace = os.getenv('ROBOFLOW_WORKSPACE', 'security-detection')
        self.workflow_id = os.getenv('ROBOFLOW_WORKFLOW_ID', 'detect-count-and-visualize-5')
        self.api_url = "https://serverless.roboflow.com"
        print(f"✅ Roboflow workflow ready: {self.workspace}/{self.workflow_id}")

    def detect_items(self, image_path: str, confidence_threshold: float = 0.4) -> List[dict]:
        """
        Detect food items in an image

        Args:
            image_path: Path to the image file
            confidence_threshold: Minimum confidence score (0-1)

        Returns:
            List of detected items with bounding boxes and confidence scores
        """
        if self.mock_mode:
            return self._mock_detect(image_path)

        try:
            import requests
            import base64

            with open(image_path, "rb") as f:
                image_b64 = base64.b64encode(f.read()).decode("utf-8")

            url = f"{self.api_url}/{self.workspace}/workflows/{self.workflow_id}"
            response = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "api_key": self.api_key,
                    "inputs": {
                        "image": {"type": "base64", "value": image_b64}
                    }
                }
            )
            response.raise_for_status()
            result = response.json()

            detections = []
            outputs = result.get('outputs', [])
            if outputs:
                predictions = outputs[0].get('predictions', {}).get('predictions', [])
                for pred in predictions:
                    # Roboflow returns center x, y, width, height
                    cx = int(pred.get('x', 0))
                    cy = int(pred.get('y', 0))
                    w = int(pred.get('width', 0))
                    h = int(pred.get('height', 0))
                    x1 = cx - w // 2
                    y1 = cy - h // 2
                    x2 = cx + w // 2
                    y2 = cy + h // 2

                    detection = {
                        "item_name": pred.get('class', 'unknown'),
                        "confidence": round(float(pred.get('confidence', 0)), 3),
                        "bounding_box": [x1, y1, x2, y2],
                    }
                    detections.append(detection)

            print(f"🔍 Detected {len(detections)} items in image")
            return detections

        except Exception as e:
            print(f"❌ Error during detection: {e}")
            return []

    def _mock_detect(self, image_path: str) -> List[dict]:
        """Return mock detections for development/demo purposes"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                h, w = 480, 640
            else:
                h, w = image.shape[:2]
        except Exception:
            h, w = 480, 640

        count = random.randint(2, 5)
        items = random.sample(MOCK_FOOD_ITEMS, min(count, len(MOCK_FOOD_ITEMS)))
        detections = []

        for i, item_name in enumerate(items):
            # Spread mock boxes across the image
            x1 = int(w * (i / count))
            y1 = random.randint(0, h // 2)
            x2 = x1 + random.randint(80, 160)
            y2 = y1 + random.randint(80, 160)

            detections.append({
                "item_name": item_name,
                "confidence": round(random.uniform(0.7, 0.95), 3),
                "bounding_box": [x1, y1, min(x2, w), min(y2, h)],
            })

        print(f"🔍 [MOCK] Detected {len(detections)} items in image")
        return detections

    def crop_detection(self, image_path: str, bounding_box: List[int], padding: int = 10) -> np.ndarray:
        """
        Crop a detected region from the image (useful for OCR)

        Args:
            image_path: Path to the original image
            bounding_box: [x1, y1, x2, y2] coordinates
            padding: Extra pixels to include around the box

        Returns:
            Cropped image as numpy array
        """
        try:
            image = cv2.imread(image_path)
            x1, y1, x2, y2 = bounding_box

            # Add padding
            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(image.shape[1], x2 + padding)
            y2 = min(image.shape[0], y2 + padding)

            cropped = image[y1:y2, x1:x2]
            return cropped

        except Exception as e:
            print(f"❌ Error cropping image: {e}")
            return None

"""
Food detection using YOLO
This module handles detecting food items in images
"""
import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Tuple
import os


class FoodDetector:
    """Detect food items in images using the YOLOv8 object detection model.

    This class handles the computer vision aspect of FridgeTrack. It uses the YOLO
    (You Only Look Once) deep learning model to identify food items and other objects
    in fridge photos. YOLO is one of the fastest and most accurate object detection
    models available.

    The detector is pre-trained on the COCO dataset which includes 80 object classes,
    many of which are food-related items like fruits, vegetables, and common packaged
    goods.

    Attributes:
        model (YOLO): The loaded YOLOv8 model instance
        food_classes (set): Set of food-related class names from COCO dataset

    Example:
        Basic usage:
        >>> detector = FoodDetector()
        >>> detections = detector.detect_items("fridge_photo.jpg")
        >>> for item in detections:
        ...     print(f"Found {item['item_name']} with {item['confidence']:.2f} confidence")
    """

    def __init__(self, model_path: str = "yolov8n.pt"):
        """Initialize the food detector and load the YOLO model.

        This constructor loads a YOLOv8 model from the specified path. If the model
        file doesn't exist locally, it will automatically download the weights from
        the Ultralytics repository.

        Different model sizes offer tradeoffs between speed and accuracy:
        - Nano (n): Fastest, good for real-time applications, ~80% accuracy
        - Small (s): Balanced, recommended for most use cases, ~85% accuracy
        - Medium (m): More accurate but slower, ~88% accuracy
        - Large (l) and XLarge (x): Highest accuracy but require more resources

        Args:
            model_path (str, optional): Path to YOLO model weights file. Defaults to "yolov8n.pt".
                Common options:
                - 'yolov8n.pt': Nano model (6MB, fastest)
                - 'yolov8s.pt': Small model (22MB, balanced)
                - 'yolov8m.pt': Medium model (52MB, more accurate)
                - Custom path to a fine-tuned model

        Example:
            Using default nano model:
            >>> detector = FoodDetector()

            Using a more accurate model:
            >>> detector = FoodDetector(model_path="yolov8s.pt")

            Using a custom fine-tuned model:
            >>> detector = FoodDetector(model_path="./models/custom_food_model.pt")

        Note:
            - First initialization downloads model weights (may take a few moments)
            - Models are cached locally after first download
            - If loading fails, falls back to nano model automatically
        """
        try:
            self.model = YOLO(model_path)
            print(f"✅ Loaded YOLO model: {model_path}")
        except Exception as e:
            print(f"⚠️  Error loading YOLO model: {e}")
            print("📥 Downloading default YOLOv8 model...")
            self.model = YOLO("yolov8n.pt")

        # Food-related class names from COCO dataset
        self.food_classes = {
            'apple', 'banana', 'orange', 'broccoli', 'carrot',
            'hot dog', 'pizza', 'donut', 'cake', 'sandwich',
            'bottle', 'wine glass', 'cup', 'fork', 'knife',
            'spoon', 'bowl'
        }

    def detect_items(self, image_path: str, confidence_threshold: float = 0.5) -> List[dict]:
        """Detect and identify objects in an image using YOLO.

        This is the main detection method. It processes an image through the YOLO model
        to find all objects, then filters the results based on confidence threshold.
        Each detected object gets a bounding box (location in the image), a class name
        (what it is), and a confidence score (how sure the model is).

        The detection process:
        1. Load and preprocess the image
        2. Run the image through the YOLO neural network
        3. Parse the model's output to get bounding boxes and classifications
        4. Filter out low-confidence detections
        5. Return a clean list of detected items

        Args:
            image_path (str): Absolute or relative path to the image file to analyze.
                Supports common formats: JPG, PNG, BMP, TIFF.
            confidence_threshold (float, optional): Minimum confidence score (0.0 to 1.0)
                for keeping a detection. Defaults to 0.5.
                - 0.3-0.4: More detections but more false positives
                - 0.5: Balanced (recommended)
                - 0.7-0.8: Fewer detections but higher quality

        Returns:
            List[dict]: List of detected objects. Each detection is a dictionary containing:
                - item_name (str): The class name (e.g., "apple", "banana", "bottle")
                - confidence (float): Confidence score rounded to 3 decimal places (0-1)
                - bounding_box (List[int]): [x1, y1, x2, y2] coordinates of the box
                    - (x1, y1): Top-left corner
                    - (x2, y2): Bottom-right corner
                - is_food_related (bool): Whether this item is in the food_classes set

            Returns an empty list [] if:
            - No objects are detected
            - All detections are below the confidence threshold
            - An error occurs during detection

        Example:
            >>> detector = FoodDetector()
            >>> detections = detector.detect_items("fridge.jpg", confidence_threshold=0.6)
            >>> print(f"Found {len(detections)} items")
            >>> for det in detections:
            ...     print(f"{det['item_name']}: {det['confidence']:.2f}")
            ...     print(f"  Location: {det['bounding_box']}")
            ...     print(f"  Is food: {det['is_food_related']}")

            Output:
            Found 3 items
            apple: 0.89
              Location: [100, 150, 250, 300]
              Is food: True
            bottle: 0.75
              Location: [400, 100, 500, 400]
              Is food: True

        Note:
            - Processing time depends on image size and model variant
            - Larger images take longer but may provide better accuracy
            - Consider resizing very large images (>2000px) for faster processing
            - YOLO can detect multiple instances of the same item
        """
        try:
            # Run YOLO detection
            results = self.model(image_path, conf=confidence_threshold)

            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].tolist()

                    # Get class name and confidence
                    class_id = int(box.cls[0])
                    class_name = self.model.names[class_id]
                    confidence = float(box.conf[0])

                    # Filter for food-related items or accept all with high confidence
                    if confidence >= confidence_threshold:
                        detection = {
                            "item_name": class_name,
                            "confidence": round(confidence, 3),
                            "bounding_box": [round(x1), round(y1), round(x2), round(y2)],
                            "is_food_related": class_name.lower() in self.food_classes
                        }
                        detections.append(detection)

            print(f"🔍 Detected {len(detections)} items in image")
            return detections

        except Exception as e:
            print(f"❌ Error during detection: {e}")
            return []

    def crop_detection(self, image_path: str, bounding_box: List[int], padding: int = 10) -> np.ndarray:
        """Extract a cropped region from an image based on detection coordinates.

        This method is extremely useful for the expiration date detection pipeline.
        After detecting a food item, we crop just that region from the image and pass
        it to OCR for reading expiration dates. Cropping improves OCR accuracy by
        removing irrelevant background and focusing on just the item.

        The method adds optional padding around the bounding box to ensure we don't
        cut off text that might be near the edges.

        Args:
            image_path (str): Path to the original full image (the same image used
                for detection).
            bounding_box (List[int]): The bounding box coordinates [x1, y1, x2, y2] returned
                from detect_items(). Represents the detected object's location.
                - x1, y1: Top-left corner pixel coordinates
                - x2, y2: Bottom-right corner pixel coordinates
            padding (int, optional): Number of extra pixels to include around all sides
                of the bounding box. Defaults to 10. Useful for ensuring text near edges
                isn't cut off.

        Returns:
            np.ndarray or None: The cropped image as a numpy array (compatible with OpenCV
                and PIL). Returns None if an error occurs (e.g., file not found, invalid
                coordinates).

                The array shape is (height, width, 3) in BGR color format (OpenCV standard).

        Example:
            >>> detector = FoodDetector()
            >>> detections = detector.detect_items("fridge.jpg")
            >>>
            >>> # Crop the first detected item
            >>> if detections:
            ...     bbox = detections[0]["bounding_box"]
            ...     cropped = detector.crop_detection("fridge.jpg", bbox, padding=15)
            ...
            ...     # Save the cropped region
            ...     if cropped is not None:
            ...         cv2.imwrite("item_closeup.jpg", cropped)
            ...
            ...         # Now use this for OCR
            ...         date = date_extractor.extract_date_from_image("item_closeup.jpg")

        Note:
            - Padding is automatically clamped to image boundaries (won't go negative or beyond image size)
            - Handles edge cases where bounding box touches image borders
            - Returns None on errors rather than raising exceptions (safe to use in pipelines)
            - The cropped image maintains the original image's color format and quality
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


# Utility function to draw detections on image (for debugging/demo)
def draw_detections(image_path: str, detections: List[dict], output_path: str = None):
    """Visualize detection results by drawing bounding boxes and labels on the image.

    This is a utility function for debugging, demonstrations, and user interfaces.
    It takes detection results and overlays them on the original image, making it
    easy to see what the model detected and where. Each detected item gets a green
    rectangle and a label showing the item name and confidence score.

    Args:
        image_path (str): Path to the original image that was processed.
        detections (List[dict]): List of detection dictionaries returned from
            detect_items(). Each detection should have:
            - bounding_box: [x1, y1, x2, y2] coordinates
            - item_name: The detected object's name
            - confidence: The confidence score
        output_path (str, optional): Where to save the annotated image. If None,
            the image is not saved to disk but is still returned. Defaults to None.

    Returns:
        np.ndarray: The annotated image as a numpy array (OpenCV format). Even if
            you don't save it, you can display it or process it further.

    Example:
        Basic usage - save annotated image:
        >>> detector = FoodDetector()
        >>> detections = detector.detect_items("fridge.jpg")
        >>> annotated = draw_detections("fridge.jpg", detections, "result.jpg")

        For debugging - just visualize without saving:
        >>> import cv2
        >>> annotated = draw_detections("fridge.jpg", detections)
        >>> cv2.imshow("Detections", annotated)
        >>> cv2.waitKey(0)

        In a web app - convert to format for display:
        >>> annotated = draw_detections("fridge.jpg", detections)
        >>> # Convert to JPEG bytes for web response
        >>> _, buffer = cv2.imencode('.jpg', annotated)
        >>> return Response(buffer.tobytes(), media_type="image/jpeg")

    Note:
        - Bounding boxes are drawn in green color (0, 255, 0)
        - Label format: "{item_name} {confidence:.2f}"
        - Font is OpenCV's HERSHEY_SIMPLEX at 0.5 scale
        - Labels are positioned above the bounding box
        - Original image file is not modified (only the returned array)
    """
    image = cv2.imread(image_path)

    for det in detections:
        x1, y1, x2, y2 = det["bounding_box"]
        label = f"{det['item_name']} {det['confidence']:.2f}"

        # Draw box
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Draw label
        cv2.putText(image, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    if output_path:
        cv2.imwrite(output_path, image)

    return image

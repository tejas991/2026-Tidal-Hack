from roboflow import Roboflow
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

class RoboflowFoodDetector:
    def __init__(self):
        """Initialize Roboflow model"""
        api_key = os.getenv('ROBOFLOW_API_KEY')
        workspace = os.getenv('ROBOFLOW_WORKSPACE')
        project = os.getenv('ROBOFLOW_PROJECT')
        version = int(os.getenv('ROBOFLOW_VERSION', 1))
        
        if not api_key:
            raise ValueError("ROBOFLOW_API_KEY not found in .env file")
        
        print(f"Connecting to Roboflow: {workspace}/{project}/v{version}")
        
        rf = Roboflow(api_key=api_key)
        self.model = rf.workspace(workspace).project(project).version(version).model
        self.confidence_threshold = 40  # 40% minimum
    
    def detect_food_items(self, image_path):
        """
        Detect food items in image
        Returns: dict with detections
        """
        try:
            # Run inference
            result = self.model.predict(image_path, confidence=self.confidence_threshold).json()
            
            detections = []
            for pred in result.get('predictions', []):
                detection = {
                    'class': pred['class'],
                    'confidence': round(pred['confidence'] * 100, 2),  # Convert to percentage
                    'bbox': {
                        'x': pred['x'],
                        'y': pred['y'],
                        'width': pred['width'],
                        'height': pred['height']
                    }
                }
                detections.append(detection)
            
            return {
                'success': True,
                'count': len(detections),
                'detections': detections,
                'image_dimensions': {
                    'width': result.get('image', {}).get('width', 0),
                    'height': result.get('image', {}).get('height', 0)
                }
            }
        
        except Exception as e:
            print(f"Detection error: {e}")
            return {
                'success': False,
                'error': str(e),
                'count': 0,
                'detections': []
            }
    
    def detect_with_visualization(self, image_path, output_path='detected_output.jpg'):
        """Save image with bounding boxes drawn"""
        try:
            result = self.model.predict(image_path, confidence=self.confidence_threshold)
            result.save(output_path)
            return output_path
        except Exception as e:
            print(f"Visualization error: {e}")
            return None
"""Quick test for AI expiry estimation"""
import sys
import os
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

from utils.gemini_helper import GeminiHelper

g = GeminiHelper()

print("=" * 50)
print("Testing AI Expiry Estimation")
print("=" * 50)

items = ["apple", "milk", "chicken", "banana", "strawberry", "bread", "cheese", "tomato"]

for item in items:
    result = g.estimate_expiration(item)
    print(f"  {item}: expires {result}")

print("=" * 50)
print("Done!")

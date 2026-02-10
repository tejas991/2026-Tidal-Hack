"""
Simple test script to verify your FridgeTrack API is working
Run this after starting your server to test all endpoints
"""
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def print_test(test_name):
    """Print test header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")


def print_success(message):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")


def print_error(message):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")


def print_info(message):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")


def test_health_check():
    """Test if server is running and healthy"""
    print_test("Health Check")

    try:
        response = requests.get(f"{BASE_URL}/health")

        if response.status_code == 200:
            data = response.json()
            print_success("Server is running!")
            print_info(f"Database: {data['database']}")
            print_info(f"Components: {json.dumps(data['components'], indent=2)}")
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server. Is it running?")
        print_info("Start the server with: python main.py")
        return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_scan_endpoint():
    """Test image scanning (without actual image)"""
    print_test("Scan Endpoint Structure")

    print_info("Note: This test checks if the endpoint exists.")
    print_info("To test with real images, use the /docs interface or upload via frontend.")

    try:
        # Just check if endpoint exists (will fail without image, but that's expected)
        response = requests.post(
            f"{BASE_URL}/api/scan",
            data={"user_id": TEST_USER_ID}
        )

        # We expect this to fail (no file uploaded), but it shouldn't be a 404
        if response.status_code != 404:
            print_success("Scan endpoint exists and is accessible")
            return True
        else:
            print_error("Scan endpoint not found")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_inventory_endpoint():
    """Test inventory retrieval"""
    print_test("Get Inventory")

    try:
        response = requests.get(f"{BASE_URL}/api/inventory/{TEST_USER_ID}")

        if response.status_code == 200:
            data = response.json()
            print_success(f"Inventory endpoint working!")
            print_info(f"User: {data['user_id']}")
            print_info(f"Total items: {data['total']}")

            if data['items']:
                print_info(f"Sample item: {data['items'][0].get('item_name', 'N/A')}")
            else:
                print_info("No items in inventory yet (this is normal for first run)")

            return True
        else:
            print_error(f"Failed with status {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_expiring_items():
    """Test expiring items endpoint"""
    print_test("Get Expiring Items")

    try:
        response = requests.get(f"{BASE_URL}/api/expiring-items/{TEST_USER_ID}?days=7")

        if response.status_code == 200:
            data = response.json()
            print_success("Expiring items endpoint working!")
            print_info(f"Total expiring: {data['total_expiring']}")
            print_info(f"Urgency breakdown: {json.dumps(data['urgency_breakdown'], indent=2)}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_recipes_endpoint():
    """Test recipe generation"""
    print_test("Recipe Generation")

    try:
        response = requests.get(f"{BASE_URL}/api/recipes/{TEST_USER_ID}?days=7")

        if response.status_code == 200:
            data = response.json()
            print_success("Recipe endpoint working!")
            print_info(f"Message: {data['message']}")

            if data['recipes']:
                print_info(f"Generated {len(data['recipes'])} recipes")
                print_info(f"First recipe: {data['recipes'][0]['name']}")
            else:
                print_info("No recipes generated (no expiring items to use)")

            return True
        else:
            print_error(f"Failed with status {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_shopping_list():
    """Test shopping list generation"""
    print_test("Shopping List")

    try:
        response = requests.get(f"{BASE_URL}/api/shopping-list/{TEST_USER_ID}")

        if response.status_code == 200:
            data = response.json()
            print_success("Shopping list endpoint working!")
            print_info(f"Total items suggested: {data['total_items']}")

            if data['shopping_items']:
                print_info(f"First suggestion: {data['shopping_items'][0].get('item_name', 'N/A')}")
            else:
                print_info("No suggestions (not enough data yet)")

            return True
        else:
            print_error(f"Failed with status {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_stats_endpoint():
    """Test user statistics"""
    print_test("User Statistics")

    try:
        response = requests.get(f"{BASE_URL}/api/stats/{TEST_USER_ID}")

        if response.status_code == 200:
            data = response.json()
            print_success("Stats endpoint working!")
            print_info(f"Total items tracked: {data['total_items_tracked']}")
            print_info(f"Items saved: {data['items_saved']}")
            print_info(f"Money saved: ${data['money_saved']}")
            print_info(f"CO2 saved: {data['co2_saved']} kg")
            return True
        else:
            print_error(f"Failed with status {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def run_all_tests():
    """Run all tests and provide summary"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}FridgeTrack API Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Testing server at: {BASE_URL}")
    print(f"Test user ID: {TEST_USER_ID}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    tests = [
        ("Health Check", test_health_check),
        ("Scan Endpoint", test_scan_endpoint),
        ("Inventory", test_inventory_endpoint),
        ("Expiring Items", test_expiring_items),
        ("Recipes", test_recipes_endpoint),
        ("Shopping List", test_shopping_list),
        ("Statistics", test_stats_endpoint),
    ]

    results = []
    for test_name, test_func in tests:
        result = test_func()
        results.append((test_name, result))

    # Summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Test Summary{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = f"{GREEN}✓ PASS{RESET}" if result else f"{RED}✗ FAIL{RESET}"
        print(f"{status} - {test_name}")

    print(f"\n{BLUE}Results: {passed}/{total} tests passed{RESET}")

    if passed == total:
        print(f"{GREEN}🎉 All tests passed! Your API is working great!{RESET}")
        print(f"{GREEN}Next step: Upload test images at {BASE_URL}/docs{RESET}")
    elif passed > 0:
        print(f"{YELLOW}⚠ Some tests passed. Check failed tests above.{RESET}")
    else:
        print(f"{RED}❌ All tests failed. Is your server running?{RESET}")
        print(f"{RED}Run: python main.py{RESET}")


if __name__ == "__main__":
    run_all_tests()

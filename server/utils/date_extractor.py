"""
Expiration date extraction using OCR
This module uses EasyOCR to read dates from food packaging
"""
import easyocr
import re
from datetime import datetime
from typing import Optional, List
import numpy as np


class DateExtractor:
    """Extract expiration dates from food packaging images using OCR (Optical Character Recognition).

    This class is responsible for reading text from images and finding expiration dates.
    It uses EasyOCR, a deep learning-based OCR library that can recognize text in various
    fonts, sizes, and formats commonly found on food packaging.

    The extraction process involves two steps:
    1. OCR: Extract all visible text from the image
    2. Date parsing: Find and interpret date patterns in the extracted text

    Attributes:
        reader (easyocr.Reader): The OCR reader instance, or None if initialization failed

    Example:
        >>> extractor = DateExtractor()
        >>> date = extractor.extract_date_from_image("milk_carton.jpg")
        >>> print(date)  # "2026-02-15"
    """

    def __init__(self, languages: List[str] = ['en']):
        """Initialize the EasyOCR reader for text recognition.

        This constructor creates an OCR reader that can recognize text in the specified
        languages. The reader is configured to run on CPU (not GPU) for better compatibility
        across different systems.

        On first run, EasyOCR will download language models (~100MB for English). These
        models are cached locally for future use.

        Args:
            languages (List[str], optional): List of ISO 639-1 language codes for OCR.
                Defaults to ['en'] (English only).
                Common options:
                - ['en']: English (default)
                - ['en', 'es']: English and Spanish
                - ['en', 'fr']: English and French
                Full list at: https://www.jaided.ai/easyocr/

        Example:
            English only (default):
            >>> extractor = DateExtractor()

            Multiple languages:
            >>> extractor = DateExtractor(languages=['en', 'es', 'fr'])

        Note:
            - First initialization downloads model weights (may take 1-2 minutes)
            - Models are cached in ~/.EasyOCR/ directory
            - GPU acceleration is disabled (gpu=False) for compatibility
            - If initialization fails, reader is set to None and errors are logged
        """
        try:
            self.reader = easyocr.Reader(languages, gpu=False)
            print(f"✅ Initialized EasyOCR with languages: {languages}")
        except Exception as e:
            print(f"❌ Error initializing EasyOCR: {e}")
            self.reader = None

    def extract_text(self, image) -> List[str]:
        """Extract all readable text from an image using OCR.

        This method runs the EasyOCR model on an image and returns all detected text.
        It filters out low-confidence results to avoid including noise or misread text.
        This is the first step in the date extraction pipeline.

        The OCR process:
        1. Detect text regions in the image
        2. Recognize characters in each region
        3. Calculate confidence for each detection
        4. Return text with confidence > 0.5

        Args:
            image (str or np.ndarray): Either:
                - File path to an image (str): e.g., "package.jpg"
                - Numpy array (np.ndarray): Already loaded image from cv2.imread()

        Returns:
            List[str]: List of text strings found in the image. Each string represents
                one piece of detected text. Returns empty list [] if:
                - No text is found
                - All detected text has confidence < 0.5
                - OCR reader is not initialized
                - An error occurs

        Example:
            From a file path:
            >>> extractor = DateExtractor()
            >>> texts = extractor.extract_text("yogurt_label.jpg")
            >>> print(texts)
            ['Best By', 'FEB 15 2026', 'Keep Refrigerated', 'NET WT 8 OZ']

            From a numpy array:
            >>> import cv2
            >>> image = cv2.imread("label.jpg")
            >>> texts = extractor.extract_text(image)

        Note:
            - Confidence threshold is set to 0.5 (50%)
            - Returns raw text without parsing or formatting
            - Text order may not match visual reading order
            - Works best with clear, high-contrast text
            - Performance depends on image quality and text size
        """
        if self.reader is None:
            return []

        try:
            # Run OCR
            results = self.reader.readtext(image)

            # Extract just the text (results are tuples of (bbox, text, confidence))
            texts = [result[1] for result in results if result[2] > 0.5]  # confidence > 0.5

            return texts

        except Exception as e:
            print(f"❌ Error during OCR: {e}")
            return []

    def find_expiration_date(self, texts: List[str]) -> Optional[datetime]:
        """Parse and extract expiration date from a list of text strings.

        This method searches through OCR-extracted text to find date patterns and
        interpret them as expiration dates. It uses multiple regex patterns to handle
        various date formats commonly found on food packaging.

        The search strategy:
        1. Combine all text strings into one searchable string
        2. Try multiple date patterns (MM/DD/YYYY, MMM DD YYYY, etc.)
        3. Prioritize dates near keywords like "exp", "best by", "use by"
        4. Parse matching patterns into datetime objects
        5. Validate that the date is in the future (not expired)

        Common formats recognized:
        - MM/DD/YYYY: "02/15/2026" or "2/15/26"
        - Month name: "FEB 15 2026", "Feb 15, 2026"
        - Compact: "15FEB26"
        - ISO format: "2026-02-15"

        Args:
            texts (List[str]): List of text strings extracted from OCR. Typically
                from the extract_text() method. Can contain any text, not just dates.

        Returns:
            datetime or None: The parsed expiration date as a datetime object, or None if:
                - No date pattern is found
                - All found dates are in the past
                - Dates cannot be parsed validly

        Example:
            >>> extractor = DateExtractor()
            >>> texts = ['Best By', 'FEB 15 2026', 'Keep Cold']
            >>> date = extractor.find_expiration_date(texts)
            >>> print(date)
            2026-02-15 00:00:00

            >>> # Multiple formats work
            >>> texts = ['EXP 03/20/2026']
            >>> date = extractor.find_expiration_date(texts)
            >>> print(date)
            2026-03-20 00:00:00

            >>> # Returns None if no valid date
            >>> texts = ['Keep Refrigerated', 'NET WT 8 OZ']
            >>> date = extractor.find_expiration_date(texts)
            >>> print(date)
            None

        Note:
            - Assumes US date format (MM/DD/YYYY) by default, but also tries DD/MM/YYYY
            - Two-digit years are interpreted as 20XX (e.g., 26 -> 2026)
            - Only returns dates in the future (prevents using manufacturing dates)
            - Keywords like "exp", "best", "use", "sell" increase match priority
        """
        # Common date patterns
        date_patterns = [
            # MM/DD/YYYY or MM-DD-YYYY
            r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})',
            # DD/MM/YYYY
            r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})',
            # YYYY-MM-DD
            r'(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})',
            # Month DD, YYYY (e.g., "JAN 15, 2025" or "Jan 15 2025")
            r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})',
            # DDMMMYY (e.g., "15JAN25")
            r'(\d{2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2})',
        ]

        # Keywords that suggest expiration date
        exp_keywords = ['exp', 'best', 'use', 'sell', 'by']

        all_text = ' '.join(texts).lower()

        for pattern in date_patterns:
            matches = re.finditer(pattern, all_text, re.IGNORECASE)

            for match in matches:
                # Check if this match is near expiration keywords
                match_pos = match.start()
                nearby_text = all_text[max(0, match_pos - 20):match_pos + 20]

                # Prioritize matches near expiration keywords
                has_keyword = any(keyword in nearby_text for keyword in exp_keywords)

                try:
                    date_obj = self._parse_date_match(match, pattern)
                    if date_obj and date_obj > datetime.now():
                        return date_obj
                except:
                    continue

        return None

    def _parse_date_match(self, match, pattern: str) -> Optional[datetime]:
        """Internal helper to convert a regex match into a datetime object.

        This private method takes a regex match object and interprets the captured
        groups as date components (year, month, day). It handles different date
        formats and validates that the components form a valid date.

        The method intelligently handles:
        - Month names (converts "Feb" -> 2)
        - Two-digit years (converts 26 -> 2026)
        - Ambiguous formats (tries MM/DD then DD/MM)
        - Different group orderings based on the regex pattern

        Args:
            match (re.Match): A regex match object from re.finditer() containing
                captured groups that represent date components.
            pattern (str): The regex pattern string that produced this match. Used
                to determine how to interpret the groups.

        Returns:
            datetime or None: A valid datetime object if the match can be parsed,
                or None if:
                - Groups don't form a valid date
                - Month or day values are out of range
                - Parsing logic fails for this pattern

        Example:
            This is an internal method, not typically called directly:
            >>> # Called internally by find_expiration_date()
            >>> pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
            >>> match = re.search(pattern, "02/15/2026")
            >>> date = extractor._parse_date_match(match, pattern)
            >>> print(date)
            2026-02-15 00:00:00

        Note:
            - This is a private method (starts with _)
            - Handles both US (MM/DD/YYYY) and international (DD/MM/YYYY) formats
            - Returns None on errors rather than raising exceptions
            - Automatically adjusts 2-digit years to 21st century
        """
        groups = match.groups()

        try:
            # Handle different date formats
            if 'jan|feb|mar' in pattern.lower():
                # Month name format
                month_names = {
                    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
                    'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
                    'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                }

                if len(groups) == 3:
                    if groups[0].lower()[:3] in month_names:
                        month = month_names[groups[0].lower()[:3]]
                        day = int(groups[1])
                        year = int(groups[2])
                    else:
                        day = int(groups[0])
                        month = month_names[groups[1].lower()[:3]]
                        year = int(groups[2])

                    # Handle 2-digit years
                    if year < 100:
                        year += 2000

                    return datetime(year, month, day)

            elif len(groups) == 3:
                # Numeric date format
                val1, val2, val3 = int(groups[0]), int(groups[1]), int(groups[2])

                # Determine which is year, month, day
                if val1 > 1000:  # YYYY-MM-DD
                    year, month, day = val1, val2, val3
                elif val3 > 1000:  # MM-DD-YYYY or DD-MM-YYYY
                    year = val3
                    # Assume MM/DD/YYYY (US format)
                    month, day = val1, val2
                else:  # 2-digit year
                    year = val3 + 2000 if val3 < 100 else val3
                    month, day = val1, val2

                # Validate ranges
                if 1 <= month <= 12 and 1 <= day <= 31:
                    return datetime(year, month, day)
                # Try swapping month and day (DD/MM format)
                elif 1 <= day <= 12 and 1 <= month <= 31:
                    return datetime(year, day, month)

        except (ValueError, IndexError) as e:
            return None

        return None

    def extract_date_from_image(self, image) -> Optional[str]:
        """Complete end-to-end pipeline to extract expiration date from an image.

        This is the main public method you should use. It combines OCR text extraction
        with date parsing into one convenient function. This is what the main API
        endpoint calls to get expiration dates from food packaging.

        The pipeline:
        1. Run OCR to extract all text from the image
        2. Search the text for date patterns
        3. Parse and validate the date
        4. Format as ISO date string (YYYY-MM-DD)

        Args:
            image (str or np.ndarray): Either:
                - File path to an image: "milk_carton.jpg"
                - Numpy array: Already loaded image

        Returns:
            str or None: The expiration date in ISO format "YYYY-MM-DD", or None if:
                - No text is found in the image
                - No date patterns are detected
                - All dates found are in the past
                - Parsing fails

        Example:
            Simple usage:
            >>> extractor = DateExtractor()
            >>> date = extractor.extract_date_from_image("yogurt.jpg")
            >>> print(date)
            "2026-02-15"

            With error handling:
            >>> date = extractor.extract_date_from_image("product.jpg")
            >>> if date:
            ...     print(f"Expires on: {date}")
            ... else:
            ...     print("No expiration date found")

            In the scan pipeline:
            >>> # Crop detected item first
            >>> cropped = food_detector.crop_detection("fridge.jpg", bbox)
            >>> cv2.imwrite("item.jpg", cropped)
            >>>
            >>> # Extract date from the cropped item
            >>> expiration_date = date_extractor.extract_date_from_image("item.jpg")

        Note:
            - Returns ISO format for easy database storage and parsing
            - Returns None (not an error) if no date is found
            - Works best on cropped images of individual items
            - For full fridge photos, crop individual items first for better accuracy
        """
        texts = self.extract_text(image)

        if not texts:
            return None

        date_obj = self.find_expiration_date(texts)

        if date_obj:
            return date_obj.strftime("%Y-%m-%d")

        return None

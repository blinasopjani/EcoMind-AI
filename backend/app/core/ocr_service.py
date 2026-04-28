import cv2
import pytesseract
import re

class BillScanner:
    def __init__(self):
        # Tesseract path might need to be configured based on installation
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        pass

    def scan_bill(self, image_path):
        # Read image
        img = cv2.imread(image_path)
        
        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Thresholding
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        # Extract text
        text = pytesseract.image_to_string(gray)
        
        # Logic to extract specific values from KESCO/KEDS bills
        # Example: "Total: 47.80 EUR" or "Konsumi: 342 kWh"
        
        amount_match = re.search(r'(?:Total|Shuma|Amount):\s*([\d.,]+)', text, re.IGNORECASE)
        kwh_match = re.search(r'(?:kWh|Konsumi):\s*([\d.,]+)', text, re.IGNORECASE)
        
        return {
            "amount": float(amount_match.group(1).replace(',', '.')) if amount_match else 0.0,
            "kwh": float(kwh_match.group(1).replace(',', '.')) if kwh_match else 0.0,
            "raw_text": text[:500] # Return first 500 chars for verification
        }

scanner = BillScanner()

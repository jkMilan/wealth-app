from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
import joblib  
import os      
import cv2
import pytesseract
from pytesseract import Output
import spacy
import re
import calendar
from datetime import datetime

# Common OCR misspellings for months
MONTH_MAP = {
    "jan": "January", "feb": "February", "mar": "March", "apr": "April",
    "may": "May", "jun": "June", "jul": "July", "aug": "August",
    "sep": "September", "oct": "October", "nov": "November", "dec": "December",
    "deer": "December", "mmer": "December", "fieb": "February", "sept": "September",
    "har": "March", "fev": "February", "avr": "April", "mai": "May"
}

def fuzzy_parse_date(text):
    text_lower = text.lower()
    
    date_patterns = [
        r'(?<!\d)(\d{4})[\s/-](\d{1,2})[\s/-](\d{1,2})(?!\d)',      
        r'(?<!\d)(\d{1,2})[\s/-](\d{1,2})[\s/-](\d{4})(?!\d)',      
        r'(?<!\d)(\d{1,2})[\s/-](\d{1,2})[\s/-](\d{2})(?!\d)',      
        r'(?<!\d)(\d{1,2})[\s/-]([a-z]{3,10})[\s/-](\d{2,4})(?!\d)',
        r'(?<!\d)([a-z]{3,10})[\s/-](\d{1,2})[\s/-](\d{2,4})(?!\d)' 
    ]
    
    current_year = datetime.now().year
    
    for pattern in date_patterns:
        match = re.search(pattern, text_lower)
        if match:
            groups = match.groups()
            found_year = -1
            for g in groups:
                 if g and g.isdigit() and len(g) >= 2:
                     y = int(g)
                     if y >= 1900 and y <= current_year + 5: 
                         if y < 100: found_year = 2000 + y
                         else: found_year = y
            
            has_month_name = any(isinstance(g, str) and not g.isdigit() for g in groups)
            if found_year == -1 and not has_month_name:
                continue

            if has_month_name:
                day = groups[0] if groups[0].isdigit() else (groups[1] if len(groups) > 1 and groups[1].isdigit() else "01")
                month_str = next((g for g in groups if g and not g.isdigit()), "")
                year = str(found_year) if found_year > 0 else str(current_year)
                for key, val_name in MONTH_MAP.items():
                    if key in month_str:
                        try:
                            month_idx = list(calendar.month_name).index(val_name)
                            dt_check = datetime(int(year), month_idx, int(day))
                            if dt_check > datetime.now() and int(year) == current_year:
                                if month_idx == 3: 
                                    return f"{year}-01-{int(day):02d}"
                            return f"{year}-{month_idx:02d}-{int(day):02d}"
                        except (ValueError, IndexError):
                            continue
            
            digits = re.findall(r'\d+', match.group())
            if len(digits) == 3:
                d1, d2, d3 = digits
                nums = [int(d1), int(d2), int(d3)]
                has_month = any(1 <= n <= 12 for n in nums)
                has_year = any(1900 <= n <= 2100 or 0 <= n <= 99 for n in nums)
                if has_month and has_year:
                    res_date = ""
                    if len(d1) == 4: res_date = f"{d1}-{d2:>02}-{d3:>02}"
                    elif len(d3) == 4: res_date = f"{d3}-{d2:>02}-{d1:>02}"
                    elif len(d3) == 2: res_date = f"20{d3}-{d2:>02}-{d1:>02}"
                    
                    if res_date:
                        try:
                            dt_obj = datetime.strptime(res_date, "%Y-%m-%d")
                            if dt_obj > datetime.now() and dt_obj.year == current_year:
                                if dt_obj.month == 3:
                                    new_res = res_date.replace("-03-", "-01-")
                                    return new_res
                            return res_date
                        except ValueError:
                            pass

    for key, val_name in MONTH_MAP.items():
        if key in text_lower:
            match = re.search(fr"{key}.*?(\d{{4}})", text_lower)
            if not match:
                match = re.search(fr"(\d{{4}}).*?{key}", text_lower)
            
            if match:
                try:
                    y_str = match.group(1)
                except IndexError:
                    m_year = re.search(r'\d{4}', match.group())
                    y_str = m_year.group() if m_year else None
                
                if y_str:
                    y = int(y_str)
                    if 1900 <= y <= current_year + 1:
                        month_idx = list(calendar.month_name).index(val_name)
                        day_match = re.search(fr"(\d{{1,2}})[\s/-]*{key}", text_lower)
                        day_val = int(day_match.group(1)) if day_match else 1
                        return f"{y}-{month_idx:02d}-{day_val:02d}"
            
    
    date_labels = [r"statement\s*date", r"bill\s*date", r"date\s*of\s*issue", r"invoice\s*date"]
    for label in date_labels:
        label_match = re.search(label, text_lower)
        if label_match:
            start_pos = label_match.end()
            context = text_lower[start_pos:start_pos + 100]
            for pattern in date_patterns:
                m = re.search(pattern, context)
                if m:
                    res = fuzzy_parse_date(context)
                    if res: return res

    return None

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
app = FastAPI(title="WELTH ML Service")

try:
    nlp = spacy.load("en_core_web_sm")
    print("Successfully loaded local spaCy NLP model.")
except OSError:
    print("WARNING: spaCy model not found. Please run: python -m spacy download en_core_web_sm")
    nlp = None

class UserStats(BaseModel):
    user_id: str
    monthly_income: float
    monthly_expenses: float
    transaction_count: int

class MonthlyData(BaseModel):
    month_index: int 
    net_cash_flow: float 

class PredictionRequest(BaseModel):
    historical_data: List[MonthlyData]

class SMSRequest(BaseModel):
    message: str
    sender: str

possible_paths = [
    os.path.join('welth-ml-service', 'welth_kmeans_model.pkl'), 
    'welth_kmeans_model.pkl',                                   
    os.path.join(os.path.dirname(__file__), 'welth_kmeans_model.pkl') 
]

cluster_model = None
for path in possible_paths:
    if os.path.exists(path):
        cluster_model = joblib.load(path)
        print(f"Successfully loaded trained WELTH ML model from: {path}")
        break

if cluster_model is None:
    print("WARNING: Model file not found! You must run train_model.py")

@app.post("/api/ml/cluster")
async def cluster_user(stats: UserStats):
    if cluster_model is None:
        raise HTTPException(status_code=500, detail="ML Model is not trained yet. Run train_model.py")
    try:
        user_data = pd.DataFrame([{
            'monthly_income': stats.monthly_income, 
            'monthly_expenses': stats.monthly_expenses, 
            'transaction_count': stats.transaction_count
        }])
        cluster_id = cluster_model.predict(user_data)[0]
        
        savings_rate = 0
        if stats.monthly_income > 0:
            savings_rate = (stats.monthly_income - stats.monthly_expenses) / stats.monthly_income

        # Map cluster to profile
        if cluster_id == 0: 
            profile = "Saver"
            advice = "Great job! You are saving over 20% of your income. Consider investing the surplus."
        elif cluster_id == 1:
            profile = "Spender"
            advice = "You are breaking even. Look for areas in your budget to reduce spending."
        else:
            profile = "Risk-Taker"
            advice = "Warning: High expenses detect. Focus on cutting discretionary spending."

        return {
            "user_id": stats.user_id,
            "profile": profile,
            "savings_rate": round(savings_rate * 100, 2),
            "custom_advice": advice
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/predict")
async def predict_cash_flow(req: PredictionRequest):
    if len(req.historical_data) < 2:
        return {"error": "Need at least 2 months of data to make a prediction."}
    try:
        df = pd.DataFrame([vars(d) for d in req.historical_data])
        X = df[['month_index']].values
        y = df['net_cash_flow'].values
        
        model = LinearRegression()
        model.fit(X, y)
        
        next_month = X[-1][0] + 1
        predicted_flow = model.predict([[next_month]])[0]
        trend = "Improving" if model.coef_[0] > 0 else "Declining"
        
        return {
            "predicted_next_month_flow": round(float(predicted_flow), 2),
            "trend": trend,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/ocr")
async def process_receipt_ocr(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Invalid image.")

        # Find the white paper against the darker background
        gray_crop = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur_crop = cv2.GaussianBlur(gray_crop, (5, 5), 0)
        _, thresh_crop = cv2.threshold(blur_crop, 150, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh_crop, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Grab the largest contour (presumably the receipt)
            largest_contour = max(contours, key=cv2.contourArea)
            image_area = image.shape[0] * image.shape[1]
            
            # Only crop if it takes up a decent chunk of the image (> 10%)
            if cv2.contourArea(largest_contour) > image_area * 0.1:
                x, y, w, h = cv2.boundingRect(largest_contour)
                image = image[y:y+h, x:x+w] # Crop out the bedsheet!
                print("DEBUG: Successfully cropped out the background.")

        # --- DUAL-PASS IMAGE ENHANCEMENT & SCORING ---
        image = cv2.resize(image, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        image = cv2.copyMakeBorder(image, 50, 50, 50, 50, cv2.BORDER_CONSTANT, value=[255, 255, 255])
        grey = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Candidate 1: Otsu (Good for flat, crumpled paper)
        _, binary_otsu = cv2.threshold(grey, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text_otsu = pytesseract.image_to_string(binary_otsu, config='--psm 6')

        # Candidate 2: Adaptive (Good for shadows and complex backgrounds)
        blur = cv2.bilateralFilter(grey, 9, 75, 75)
        binary_adaptive = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        text_adaptive = pytesseract.image_to_string(binary_adaptive, config='--psm 6')

        # Scoring function to pick the most logical receipt text
        def score_ocr_text(t):
            if not t: return 0
            score = sum(c.isalnum() for c in t) 
            upper_t = t.upper()
            
            # 1. Heavily reward actual banking and receipt keywords
            keywords = ['TOTAL', 'GRAND', 'CASH', 'TAX', 'INVOICE', 'RECEIPT', 'DATE', 'AMOUNT', 'QTY', 'ITEM'
            'DEPOSIT', 'BANK', 'LKR', 'RS', 'BALANCE', 'ACCOUNT', 'CARD', 'WITHDRAWAL', 'CEYLON', 'SAMPATH'
            'COMMERCIAL', 'COMMERCIAL BANK', 'BANK OF CEYLON', 'BOC', 'SAMPATH BANK', 'DFCC', 'DFCC BANK'
            ]
            found_keywords = 0
            for kw in keywords:
                if kw in upper_t:
                    score += 200
                    found_keywords += 1
            
            # 2. Reward finding proper decimal amounts (using our updated regex)
            if re.search(r'[\d,\s]+\.\s?\d{2}', t): 
                score += 300
            
            # 3. Only add character count if we actually found receipt keywords
            # This prevents giant blocks of hallucinated gibberish from winning
            if found_keywords > 0:
                score += sum(c.isalnum() for c in t) * 0.1
            
            return score

        score_otsu = score_ocr_text(text_otsu)
        score_adaptive = score_ocr_text(text_adaptive)

        if score_adaptive > score_otsu:
            print(f"DEBUG: Selected ADAPTIVE Thresholding (Score: {score_adaptive} vs Otsu: {score_otsu})")
            text = text_adaptive
            binary = binary_adaptive
        else:
            print(f"DEBUG: Selected OTSU Thresholding (Score: {score_otsu} vs Adaptive: {score_adaptive})")
            text = text_otsu
            binary = binary_otsu

        print(f"--- OCR EXTRACTED TEXT ---\n{text}\n-------------------------")

        if not text:
            raise ValueError("No text extracted.")

        doc = nlp(text) if nlp else None

        # --- 1. SPATIAL BOUNDING BOX AMOUNT EXTRACTION ---
        amount = 0.0
        ocr_data = pytesseract.image_to_data(binary, output_type=Output.DICT, config='--psm 6')
        
        target_y_coords = []
        for i in range(len(ocr_data['text'])):
            word = ocr_data['text'][i].upper()
            if any(k in word for k in ['TOTAL', 'GRAND', 'DUE', 'PAYABLE', 'AMOUNT']):
                target_y_coords.append(ocr_data['top'][i])
        
        found_spatial_amounts = []
        y_tolerance = 20 
        
        for i in range(len(ocr_data['text'])):
            word = str(ocr_data['text'][i])
            if re.match(r'^[^\d]*[\d,\s]+\.\s?\d{2}[^\d]*$', word):
                clean_val_str = re.sub(r'[^\d\.]', '', word).strip('.')
                if clean_val_str:
                    try:
                        val = float(clean_val_str)
                        for target_y in target_y_coords:
                            if abs(ocr_data['top'][i] - target_y) <= y_tolerance:
                                found_spatial_amounts.append(val)
                                break
                    except ValueError:
                        continue
                            
        if found_spatial_amounts:
            amount = max(found_spatial_amounts)
            print(f"DEBUG: Spatially matched amount: {amount}")
        else:
            print("DEBUG: Spatial match failed, falling back to regex.")
            amount_patterns = [
                r'(?:GRAND\s?TOTAL|TOTAL\s?DUE|NET\s?PAYABLE|TOTAL\s?INCLUSIVE).*?([\d,\s]+\.\s?\d{2})',
                r'(?:TOTAL|AMOUNT).*?([\d,\s]+\.\s?\d{2})',
                r'(?:RS|LKR|RM)\.?\s?([\d,\s]+\.\s?\d{2})',
                r'\$[\d,\s]+\.\s?\d{2}',
                r'[\d,\s]+\.\s?\d{2}',
                r'[\d,\s:]+\.\s?\d{2}',
            ]
            
            found_amounts = []
            for pattern in amount_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for m in matches:
                    try:
                        val_str = m.group(1) if '(' in pattern else m.group(0)
                        val_str = re.sub(r'[^\d\.]', '', val_str.replace(',', '').replace(':', '')).strip('.')
                        if val_str and val_str != '.':
                            val = float(val_str)
                            if 1.0 <= val < 1000000:
                                found_amounts.append(val)
                    except (IndexError, ValueError):
                        continue
            if found_amounts:
                amount = max(found_amounts)
            
           # --- 1. Math Verification (Total = Cash - Balance) ---
            cash_amount = 0.0
            balance_amount = 0.0
        
            # Scan lines for Cash and Balance values
            for line in text.split('\n'):
                upper_line = line.upper()
                nums = re.findall(r'[\d,]+\.\d{2}', line)
                if nums:
                    val = float(nums[-1].replace(',', ''))
                    if "CASH" in upper_line and not "TOTAL" in upper_line:
                        cash_amount = val
                    elif any(k in upper_line for k in ["BALANCE", "CHANGE"]):
                        balance_amount = val
                    
            # If we have both, calculate the true total
            if cash_amount > 0 and balance_amount > 0 and cash_amount > balance_amount:
                calculated_total = round(cash_amount - balance_amount, 2)
                # If the calculated total is extremely close to the OCR total (e.g., 850.00 vs 850.66)
                if abs(calculated_total - amount) < 1.0:
                    print(f"DEBUG: Math verification corrected OCR error: {amount} -> {calculated_total}")
                    amount = calculated_total

            # --- 2. Thermal Printer Zero Artifact Fix ---
            # In Sri Lanka, prices almost never end in .66 or .88. Snap them to .00
            amount_str = f"{amount:.2f}"
            if amount_str.endswith('.66') or amount_str.endswith('.88') or amount_str.endswith('.99'):
                corrected_amount = float(amount_str[:-2] + '00')
                print(f"DEBUG: Correcting thermal zero artifact: {amount} -> {corrected_amount}")
                amount = corrected_amount 

        print(f"DEBUG: Final Detected Amount: {amount}")

        # 2. Date Extraction
        receipt_date = fuzzy_parse_date(text)
        if not receipt_date:
            date_patterns = [
                r'\d{1,2}/\d{1,2}/\d{2,4}',
                r'\d{1,2}-\d{1,2}-\d{2,4}',
                r'\d{4}-\d{1,2}-\d{1,2}'
            ]
            for pattern in date_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    receipt_date = match.group()
                    break
        
        if not receipt_date:
            receipt_date = datetime.now().strftime('%Y-%m-%d')

        # 3. Merchant detection
        merchant = "Unknown Merchant"
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        
        # 1. First search entire text for "Anchor Merchants"
        anchor_merchants = {
            "COMMERCIAL BANK": "Commercial Bank",
            "CONMERCIAL": "Commercial Bank", 
            "SAMPATH": "Sampath Bank",
            "HATTON": "Hatton National Bank",
            "HNB": "Hatton National Bank",
            "SEYLAN": "Seylan Bank",
            "PEOPLE'S BANK": "People's Bank",
            "PEOPLES BANK": "People's Bank",
            "NDB": "National Development Bank",
            "NATIONAL DEVELOPMENT": "National Development Bank",
            "NTB": "Nations Trust Bank",
            "NATIONS TRUST": "Nations Trust Bank",
            "DFCC": "DFCC Bank",
            "PAN ASIA": "Pan Asia Bank",
            "UNION BANK": "Union Bank",
            "AMANA": "Amana Bank",
            "BANK OF CEYLON": "Bank of Ceylon",
            "BOC": "Bank of Ceylon",
            "OF CEYLON": "Bank of Ceylon",
            "OF GEVEON": "Bank of Ceylon",
            "NOLIMIT": "NOLIMIT",
            "STICKS & CO": "Sticks & Co.",
            "KEELLS": "Keells Super",
            "CARGILLS": "Cargills Food City",
            "CEB": "Ceylon Electricity Board",
            "ELECTRICITY BOARD": "Ceylon Electricity Board",
            "WATER BOARD": "Water Board",
            "DIALOG": "Dialog Axiata",
            "MOBITEL": "Mobitel",
            "UBER": "Uber",
            "PICKME": "PickMe",
            "KELLS": "Keells Super"
        }
        
        upper_text = text.upper()
        for key, display_name in anchor_merchants.items():
            if key in upper_text:
                merchant = display_name
                break

        if merchant == "Unknown Merchant":
            valid_lines = []
            for line in lines[:8]:
                upper_line = line.upper()
                # Ignore address, noise, and technical artifacts 
                if any(k in upper_line for k in ["WAGE", "INVOICE", "RECEIPT", "BILL", "CONTACT", "TEL:", "PHONE", "PAGE", "DATE", "TAX", "DINE IN", "ORDER", "TABLE:", "JALAN", "SELANGOR", "GST", "ALAM", "SHAHVALAM", "ROAD", "AUCKLAND", "ZEALAND", "CLIENT", "BUSINESS NAME", "WELLAWATTA", "GALLE ROAD", "CASHIER:", "STATION", "STORE:", "BRANCH:"]):
                    continue
                
                # Version/File-like pattern check (e.g., v.1.0, data.csv)
                if re.search(r'v\.?\d\.\d', upper_line) or re.search(r'\.[a-z]{3,4}$', line):
                    continue

                if len(line) > 3:
                    valid_lines.append(line)
            
            if valid_lines:
                merchant = valid_lines[0]
                if len(valid_lines) > 1 and len(valid_lines[0]) < 10 and len(valid_lines[1]) < 15:
                     merchant = valid_lines[0] + " " + valid_lines[1]

        # NLP Fallback 
        if merchant == "Unknown Merchant" and doc:
            invalid_orgs = ['UPI', 'CGST', 'SGST', 'IGST', 'GST', 'TAX', 'CASH', 'VISA', 'MASTERCARD', 'TOTAL', 'AMOUNT', 'NET']
            orgs = [ent.text for ent in doc.ents if ent.label_ == "ORG" and not any(bad in ent.text.upper() for bad in invalid_orgs)]
            if orgs:
                merchant = orgs[0]
        
        # Post-process merchant for CEB
        if "EBIL-CEB" in merchant.upper() or "CEB" == merchant.upper().split()[0]:
            merchant = "Ceylon Electricity Board"

        # 4. Category detection 
        combined_text = (text + " " + merchant).lower()
        category = "shopping"
        
        keywords = {
            "Deposit": ["deposit", "credited", "saving", "cash deposit"],
            "Withdrawal": ["withdrawal", "atm draw", "cash withdrawal"],
            "Food": ["restaurant", "food", "eat", "cafe", "meal", "pizza", "burger", "coffee", "keells", "cargills", "supermarket", "dine", "kitchen", "bake", "lane", "indian", "spice", "route", "naan", "curry", "paneer", "biryani", "lassi", "thali", "sticks"],
            "Entertainment": ["pub", "bar", "cinema", "movie", "theater", "game", "club", "party", "drink", "cocktail", "liquor", "netflix", "spotify", "billard"],
            "Transportation": ["fuel", "petrol", "gas", "taxi", "uber", "pickme", "transport", "garage", "travel", "bus", "train", "metro"],
            "Healthcare": ["pharmacy", "medical", "clinic", "health", "hospital", "doctor", "chemist", "dental", "medicine"],
            "Utilities": ["dialog", "mobitel", "electricity", "water", "bill", "recharge", "internet", "phone", "wifi", "ceb", "nwsdb", "board", "power", "utility"],
            "Shopping": ["shopping", "retail", "store", "mall", "clothing", "electronics", "fashion", "no-limit", "cool-planet", "odell"],
            "Education": ["school", "college", "university", "course", "tution", "book", "stationary", "udemy", "coursera"],
            "Personal Care": ["salon", "spa", "hair", "beauty", "gym", "care", "wellness", "shampoo", "soap", "cosmetic", "personal"],
            "Travel": ["hotel", "flight", "booking", "plane", "stay", "airbnb", "agoda"],
            "Bills & Fees": ["repair", "service", "charge", "maintenance", "tax", "fee", "expert", "valuation", "legal"],
            "Housing": ["rent", "mortgage", "property", "lease", "apartment"],
            "Groceries": ["groceries", "market", "vegetable", "fruit", "milk", "egg", "bread"],
            "Gifts & Donations": ["gift", "donation", "charity", "present", "birthday", "wedding"],
            "Insurance": ["insurance", "policy", "premium", "allianz"],
            "Other Expenses": ["miscellaneous", "other"]
        }

        lower_merchant = merchant.lower()
        
        if any(re.search(fr'\b{re.escape(k)}\b', lower_merchant) for k in ["pub", "bar", "club"]):
            category = "entertainment"
        elif any(re.search(fr'\b{re.escape(k)}\b', lower_merchant) for k in ["spice", "route", "restaurant", "cafe", "kitchen", "food", "sticks"]):
            category = "food"
        elif any(re.search(fr'\b{re.escape(k)}\b', lower_merchant) for k in ["garden", "repairs", "service", "maintenance", "expert"]):
            category = "bills" 

        for cat, keys in keywords.items():
            if any(re.search(fr'\b{re.escape(k)}\b', combined_text) for k in keys):
                category = cat
                if cat in ["food", "entertainment", "bills", "utilities"]:
                    break
        
        # Strict override for electricity/water/ceb
        if any(x in combined_text for x in ["ceb", "electricity", "water board", "utility bill"]):
            category = "utilities"
            
        # 5. Type detection
        txn_type = "EXPENSE"
        upper_text = text.upper()
        if any(x in upper_text for x in ["REFUND", "CREDIT NOTE", "DEPOSIT", "REVERSAL", "RECEIVED", "CREDITED"]):
            txn_type = "INCOME"
        
        print(f"DEBUG: Detected Date: {receipt_date}")
        print(f"DEBUG: Detected Category: {category}")
        print(f"DEBUG: Detected Merchant: {merchant}")

        return {
            "success": True,
            "amount": amount,
            "date": receipt_date,
            "description": merchant if merchant != "Unknown Merchant" else "Scanned Receipt",
            "category": category,
            "merchantName": merchant,
            "type": txn_type
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/sms")
async def process_sms_nlp(req: SMSRequest):
    try:
        text = req.message.lower()
        doc = nlp(text) if nlp else None
        
        amount = 0.0
        match = re.search(r'(?:rs|lkr|\$)?\s?([\d,]+\.\d+|[\d,]+)', text)
        if match:
            amount = float(match.group(1).replace(',', ''))

        txn_type = "EXPENSE"
        if any(x in text for x in ["credited", "received", "deposit"]):
            txn_type = "INCOME"
        elif any(x in text for x in ["debited", "paid", "purchase"]):
            txn_type = "EXPENSE"

        merchant = "Unknown"
        if doc:
            orgs = [ent.text.title() for ent in doc.ents if ent.label_ in ["ORG", "PERSON"]]
            if orgs:
                merchant = orgs[-1]

        if merchant == "Unknown":
            m = re.search(r'(?:at|to|from)\s([a-zA-Z\s]+)', text)
            if m:
                merchant = m.group(1).title()

        merchant_lower = merchant.lower()
        category = "shopping"
        if "keells" in merchant_lower or "cargills" in merchant_lower:
            category = "food"
        elif "uber" in merchant_lower:
            category = "transportation"
        elif "dialog" in merchant_lower:
            category = "utilities"

        return {
            "success": True,
            "amount": amount,
            "type": txn_type,
            "merchant": merchant,
            "category": category,
            "original_sender": req.sender
        }
    except Exception as e:
        print(f"SMS NLP Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Starting WELTH ML Service on http://0.0.0.0:8000")
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    except Exception as e:
        print(f"Failed to start server: {e}")
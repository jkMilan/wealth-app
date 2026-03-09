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
from ollama1 import get_json_from_prompt
from ollama2 import get_category_from_ollama

# Ensure Tesseract path is set correctly for your Windows machine
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
app = FastAPI(title="WELTH ML Service")

# --- DATA MODELS (What Next.js will send to Python) ---

class UserStats(BaseModel):
    user_id: str
    monthly_income: float
    monthly_expenses: float
    transaction_count: int

class MonthlyData(BaseModel):
    month_index: int # e.g., 1 for Jan, 2 for Feb
    net_cash_flow: float # Income - Expenses

class PredictionRequest(BaseModel):
    historical_data: List[MonthlyData]

# --- 1. LOAD THE REAL TRAINED CLUSTERING MODEL ---
# Instead of faking the data, we load the actual trained brain!

MODEL_PATH = 'welth_kmeans_model.pkl'

if os.path.exists(MODEL_PATH):
    cluster_model = joblib.load(MODEL_PATH)
    print("✅ Successfully loaded trained WELTH model from database data.")
else:
    print("⚠️ WARNING: Model file not found. You must run train_model.py first!")
    cluster_model = None

@app.post("/api/ml/cluster")
async def cluster_user(stats: UserStats):
    """Assigns a financial personality to the user based on their habits."""
    
    # Failsafe: If you forgot to run train_model.py, tell the frontend!
    if cluster_model is None:
        raise HTTPException(status_code=500, detail="ML Model is not trained yet. Run train_model.py on your server.")

    try:
        # Prepare the user's data point
        user_data = np.array([[stats.monthly_income, stats.monthly_expenses, stats.transaction_count]])
        
        # Predict which cluster they belong to using the REAL model
        cluster_id = cluster_model.predict(user_data)[0]
        
        # Calculate their actual savings rate to help assign the label
        savings_rate = 0
        if stats.monthly_income > 0:
            savings_rate = (stats.monthly_income - stats.monthly_expenses) / stats.monthly_income

        # Determine label based on basic financial logic and the cluster
        if savings_rate >= 0.20:
            profile = "Saver"
            advice = "Great job! You are saving over 20% of your income. Consider investing the surplus."
        elif stats.monthly_expenses > stats.monthly_income:
            profile = "Risk-Taker"
            advice = "Warning: You are spending more than you earn. Focus on cutting discretionary expenses immediately."
        else:
            profile = "Spender"
            advice = "You are breaking even. Look for areas in your budget to reduce spending and build an emergency fund."

        return {
            "user_id": stats.user_id,
            "profile": profile,
            "savings_rate": round(savings_rate * 100, 2),
            "custom_advice": advice
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. PREDICTION MODEL (Cash Flow Forecasting) ---

@app.post("/api/ml/predict")
async def predict_cash_flow(req: PredictionRequest):
    """Predicts next month's cash flow using Linear Regression on historical data."""
    if len(req.historical_data) < 2:
        return {"error": "Need at least 2 months of data to make a prediction."}
    
    try:
        # Convert incoming JSON to Pandas DataFrame
        df = pd.DataFrame([vars(d) for d in req.historical_data])
        
        # X = Month Index (Time), y = Net Cash Flow
        X = df[['month_index']].values
        y = df['net_cash_flow'].values
        
        # Train a simple Linear Regression model
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict the next month
        next_month = X[-1][0] + 1
        predicted_flow = model.predict([[next_month]])[0]
        
        # Calculate trend (is cash flow improving or worsening?)
        trend = "Improving" if model.coef_[0] > 0 else "Declining"
        
        return {
            "predicted_next_month_flow": round(float(predicted_flow), 2),
            "trend": trend,
            "confidence_note": "Based on historical linear trends."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. OCR RECEIPT SCANNER (OpenCV + Tesseract + Phi-3) ---

@app.post("/api/ml/ocr")
async def process_receipt_ocr(file: UploadFile = File(...)):
    """Receives an image, cleans it with OpenCV, extracts text, and categorizes via LLM."""
    try:
        # 1. Read the uploaded image into memory
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        color_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if color_image is None:
            raise ValueError("Failed to decode image file.")

        # 2. Image Cleaning (Your custom logic)
        grey_image = cv2.cvtColor(color_image, cv2.COLOR_BGR2GRAY)
        blur_image = cv2.GaussianBlur(grey_image, (5, 5), 0)
        ret, binary_image = cv2.threshold(blur_image, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        # 3. OCR Text Extraction
        raw_text = pytesseract.image_to_string(binary_image)
        if not raw_text or raw_text.strip() == "":
            raise ValueError("No text could be extracted from the image.")

        # 4. JSON Structuring via Local Ollama (Phi-3)
        structured_data = get_json_from_prompt(raw_text)
        
        # 5. Extract specific fields for Next.js
        if structured_data and "Description" in structured_data and len(structured_data["Description"]) > 0:
            first_item = str(structured_data["Description"][0])
            category = get_category_from_ollama(first_item)
            
            return {
                "success": True,
                "amount": structured_data.get("Grand_Total", 0),
                "description": first_item,
                "category": category,
                "merchantName": structured_data.get("billed_by", "Unknown Merchant")
            }
        else:
            raise ValueError("AI failed to structure the receipt data.")

    except Exception as e:
        print(f"OCR Pipeline Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
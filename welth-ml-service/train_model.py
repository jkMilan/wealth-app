import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import joblib
import os

print("Starting training process for WELTH ML Model...")

# 1. Generate some synthetic (dummy) training data
# This teaches the AI what different financial profiles look like.
# Columns: [monthly_income, monthly_expenses, transaction_count]
data = {
    'monthly_income': [5000, 4000, 8000, 3000, 6000, 10000, 2000, 7000, 4500, 8500],
    'monthly_expenses': [4500, 4200, 3000, 2900, 5800, 4000, 2500, 3500, 4000, 8000],
    'transaction_count': [45, 50, 20, 15, 60, 25, 10, 30, 40, 55]
}

# Convert to a Pandas DataFrame
df = pd.DataFrame(data)

# 2. Initialize and train the K-Means model
# We define 3 clusters representing basic groups (e.g., Savers, Spenders, Risk-Takers)
print("Training the K-Means algorithm with synthetic data...")
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
kmeans.fit(df)

# 3. Save the trained model to a .pkl file
# Ensure it saves exactly in the folder where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'welth_kmeans_model.pkl')

joblib.dump(kmeans, MODEL_PATH)

print(f"✅ Model successfully trained!")
print(f"✅ File saved to: {MODEL_PATH}")
print("You can now start your main FastAPI server.")
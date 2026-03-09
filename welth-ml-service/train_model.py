import pandas as pd
from sqlalchemy import create_engine
from sklearn.cluster import KMeans
import joblib
import numpy as np

# 1. Connect to your real PostgreSQL database (Copy this URL from your Next.js .env file)
# Example: "postgresql://postgres:password@localhost:5432/wealth_app_db"
DATABASE_URL = "postgresql://postgres.prcfubxckwsupvcusolf:A8RSvmdSInGhlYci@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
engine = create_engine(DATABASE_URL)

print("Fetching data from the database...")

# 2. Extract Data: Query the database to get total income and expenses for every user
query = """
    SELECT 
        transactions."userId",
        SUM(CASE WHEN transactions.type = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transactions.type = 'EXPENSE' THEN ABS(amount) ELSE 0 END) as total_expenses,
        COUNT(transactions.id) as transaction_count
    FROM transactions 
    JOIN accounts ON transactions."accountId" = accounts.id
    GROUP BY transactions."userId";
"""

# Load data into a Pandas DataFrame
df = pd.read_sql(query, engine)

# If your database is empty right now, we will add some dummy rows just so the model can train
if len(df) < 10:
    print("Not enough real users. Adding synthetic data for training...")
    dummy_data = pd.DataFrame({
        'total_income': np.random.randint(2000, 10000, 50),
        'total_expenses': np.random.randint(1000, 9000, 50),
        'transaction_count': np.random.randint(5, 50, 50)
    })
    df = pd.concat([df, dummy_data], ignore_index=True)

# 3. Prepare the Features (The data the model actually learns from)
X = df[['total_income', 'total_expenses', 'transaction_count']]

# 4. Train the Model
print("Training the K-Means model...")
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
kmeans.fit(X)

# 5. Save the Trained Model to a file
joblib.dump(kmeans, 'welth_kmeans_model.pkl')
print("Training complete! Model saved as 'welth_kmeans_model.pkl'")
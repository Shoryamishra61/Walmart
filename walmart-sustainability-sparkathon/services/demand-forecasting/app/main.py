from fastapi import FastAPI
from .models import PredictionFeatures # <-- Updated import
import joblib
import pandas as pd
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Walmart Demand Forecasting API",
    description="An innovative API using ML to predict stock requirements, reducing waste and optimizing logistics."
)

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'demand_model.pkl')
model = joblib.load(model_path)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Powered Demand Forecasting API"}

# The endpoint is now updated to accept the new feature set
@app.post("/predict_daily_sales")
async def predict_daily_sales(features: PredictionFeatures):
    """
    Predicts the daily sales for a single day based on a rich feature set.
    """
    try:
        # Create a DataFrame from the input features that matches the model's training columns
        feature_df = pd.DataFrame([features.dict()])
        
        # Ensure the column order is the same as during training
        training_columns = ['store_id', 'product_id', 'is_weekend', 'is_holiday', 'promotion_applied', 'day_of_year', 'month', 'year', 'day_of_week']
        feature_df = feature_df[training_columns]

        prediction = model.predict(feature_df)
        
        # Return the prediction
        return {
            "predicted_sales": int(prediction[0])
        }
    except Exception as e:
        return {"error": str(e)}
import pandas as pd
import xgboost as xgb
import joblib
import os

print("--- Training Enterprise-Grade XGBoost Model ---")

# Load the new dataset
df = pd.read_csv('data/simulated_sales.csv')
df['date'] = pd.to_datetime(df['date'])

# Feature Engineering
df['day_of_year'] = df['date'].dt.dayofyear
df['month'] = df['date'].dt.month
df['year'] = df['date'].dt.year
df['day_of_week'] = df['date'].dt.dayofweek

# Define features (X) and target (y)
features = ['store_id', 'product_id', 'is_weekend', 'is_holiday', 'promotion_applied', 'day_of_year', 'month', 'year', 'day_of_week']
target = 'daily_sales'

X = df[features]
y = df[target]

# Initialize and train the XGBoost Regressor model
# These parameters are a starting point for a robust model
xgb_model = xgb.XGBRegressor(
    objective='reg:squarederror',
    n_estimators=1000,
    learning_rate=0.05,
    max_depth=5,
    subsample=0.8,
    colsample_bytree=0.8,
    n_jobs=-1,
    early_stopping_rounds=50 # Prevents overfitting
)

print("Training model... This might take a moment.")
# We need a validation set for early stopping
from sklearn.model_selection import train_test_split
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

xgb_model.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              verbose=False)

# Save the trained model
model_dir = 'models'
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, 'demand_model.pkl')
joblib.dump(xgb_model, model_path)

print(f"✅ XGBoost model trained and saved to {model_path}")
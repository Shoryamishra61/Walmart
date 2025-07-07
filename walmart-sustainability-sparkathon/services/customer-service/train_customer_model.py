import pandas as pd
from sklearn.linear_model import LogisticRegression
import joblib
import os

print("--- Training Customer Future Purchase Model ---")

# We will use the sales data to infer purchase history
df_sales = pd.read_csv('../demand-forecasting/data/simulated_sales.csv')

# Create a simple "customer profile"
# A customer is defined by the products they buy frequently
# For simplicity, we'll create a few customer profiles based on product pairs
# Customer '12345' frequently buys Product_1 and Product_4
# Customer '67890' frequently buys Product_0 and Product_2
customer_profiles = {
    '12345': [1, 4],
    '67890': [0, 2]
}

# Create training data
X_train = []
y_train = []

all_products = df_sales['product_id'].unique()

for customer_id, frequent_items in customer_profiles.items():
    for product_id in all_products:
        # Features: a simple one-hot encoding of customer and product
        features = {'customer_id': int(customer_id), 'product_id': product_id}
        X_train.append(features)
        
        # Target: Did the customer buy this product? (1 if it's in their frequent list, 0 otherwise)
        y_train.append(1 if product_id in frequent_items else 0)

df_train = pd.DataFrame(X_train)

# Initialize and train the Logistic Regression model
model = LogisticRegression()
model.fit(df_train, y_train)

# Save the trained model
model_dir = 'models'
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, 'customer_purchase_model.pkl')
joblib.dump(model, model_path)

print(f"✅ Customer purchase model trained and saved to {model_path}")
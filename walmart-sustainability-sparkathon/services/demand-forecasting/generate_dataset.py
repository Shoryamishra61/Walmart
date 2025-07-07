import pandas as pd
import numpy as np
from datetime import date, timedelta

print("--- Generating Realistic Sales Dataset ---")

# Configuration
num_products = 5
num_stores = 3
start_date = date(2023, 1, 1)
end_date = date(2024, 12, 31)
holidays = [date(2023, 1, 26), date(2023, 8, 15), date(2023, 10, 24), date(2024, 1, 26), date(2024, 8, 15), date(2024, 11, 1)] # Example Indian Holidays

# Create products and stores
products = [{'product_id': i, 'product_name': f'Product_{i}', 'base_sales': np.random.randint(50, 200)} for i in range(num_products)]
stores = [{'store_id': i, 'store_name': f'Store_{i}'} for i in range(num_stores)]

# Generate data
data = []
current_date = start_date
while current_date <= end_date:
    for store in stores:
        for product in products:
            base_sales = product['base_sales']
            
            # Factors affecting sales
            day_of_week_factor = 1.4 if current_date.weekday() >= 5 else 1.0 # Weekend boost
            holiday_factor = 2.0 if current_date in holidays else 1.0 # Holiday boost
            promotion_factor = np.random.choice([1.5, 1.0], p=[0.1, 0.9]) # Random promotions
            
            # Noise
            noise = np.random.normal(1, 0.1)
            
            daily_sales = int(base_sales * day_of_week_factor * holiday_factor * promotion_factor * noise)
            
            data.append({
                'date': current_date,
                'store_id': store['store_id'],
                'product_id': product['product_id'],
                'daily_sales': daily_sales,
                'is_weekend': 1 if day_of_week_factor > 1.0 else 0,
                'is_holiday': 1 if holiday_factor > 1.0 else 0,
                'promotion_applied': 1 if promotion_factor > 1.0 else 0
            })
    current_date += timedelta(days=1)

df = pd.DataFrame(data)
output_path = 'data/simulated_sales.csv'
df.to_csv(output_path, index=False)

print(f"✅ Generated {len(df)} rows of data and saved to {output_path}")
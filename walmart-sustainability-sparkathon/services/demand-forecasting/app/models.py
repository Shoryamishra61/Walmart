from pydantic import BaseModel
from typing import List
from pydantic import BaseModel

# This new model matches the features our XGBoost model was trained on
class PredictionFeatures(BaseModel):
    store_id: int
    product_id: int
    is_weekend: int
    is_holiday: int
    promotion_applied: int
    day_of_year: int
    month: int
    year: int
    day_of_week: int
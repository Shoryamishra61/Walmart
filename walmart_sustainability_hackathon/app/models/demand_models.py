from datetime import datetime
from typing import List, Dict, Any, Optional

class SalesDataPoint:
    def __init__(self, timestamp: datetime, quantity_sold: int, price: float):
        self.timestamp = timestamp
        self.quantity_sold = quantity_sold
        self.price = price

class WeatherDataPoint:
    def __init__(self, date: datetime, temperature: float, precipitation_prob: float):
        self.date = date
        self.temperature = temperature
        self.precipitation_prob = precipitation_prob

class EventDataPoint:
    def __init__(self, name: str, start_date: datetime, end_date: datetime, expected_impact: float):
        self.name = name
        self.start_date = start_date
        self.end_date = end_date
        self.expected_impact = expected_impact

class CompetitorPricePoint:
    def __init__(self, timestamp: datetime, competitor_id: str, price: float):
        self.timestamp = timestamp
        self.competitor_id = competitor_id
        self.price = price

class SocialTrendPoint:
    def __init__(self, timestamp: datetime, keyword: str, sentiment_score: float):
        self.timestamp = timestamp
        self.keyword = keyword
        self.sentiment_score = sentiment_score

class ForecastInput: # This would represent one row of features for the model
    def __init__(self, date: datetime, features: Dict[str, Any]):
        self.date = date
        # Example features:
        # {"lag_7_sales": 100, "temp": 25, "is_event": 1, "day_of_week": 3,
        #  "month": 10, "competitor_price_ratio": 1.05, "social_sentiment": 0.2}
        self.features = features

class ForecastOutputPoint:
    def __init__(self, date: datetime, predicted_units: float,
                 confidence_low: Optional[float] = None,
                 confidence_high: Optional[float] = None):
        self.date = date
        self.predicted_units = predicted_units
        self.confidence_low = confidence_low
        self.confidence_high = confidence_high

    def to_dict(self): # Helper for JSON serialization
        return {
            "date": self.date.isoformat(),
            "predicted_units": self.predicted_units,
            "confidence_low": self.confidence_low,
            "confidence_high": self.confidence_high
        }

class ForecastResult:
    def __init__(self, product_sku: str, store_id: str, forecast_points: List[ForecastOutputPoint],
                 influencing_factors_summary: Optional[List[Dict[str, str]]] = None):
        self.product_sku = product_sku
        self.store_id = store_id
        self.forecast_points = forecast_points
        self.generated_at = datetime.now()
        self.influencing_factors_summary = influencing_factors_summary if influencing_factors_summary is not None else []

    def to_dict(self): # Helper for JSON serialization
        return {
            "product_sku": self.product_sku,
            "store_id": self.store_id,
            "generated_at": self.generated_at.isoformat(),
            "forecast_points": [fp.to_dict() for fp in self.forecast_points],
            "influencing_factors_summary": self.influencing_factors_summary
        }

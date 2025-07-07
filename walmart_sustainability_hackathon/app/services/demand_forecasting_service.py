from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import random
import pandas as pd

# Assuming models are in a sibling directory 'models'
from ..models.demand_models import (
    SalesDataPoint, WeatherDataPoint, EventDataPoint,
    CompetitorPricePoint, SocialTrendPoint,
    ForecastOutputPoint, ForecastResult
)

# --- Mock Data Generation (can be expanded or moved to a separate mock_data module) ---
def generate_mock_sales_data(days=365) -> List[SalesDataPoint]:
    data = []
    start_date = datetime.now() - timedelta(days=days)
    for i in range(days):
        d = start_date + timedelta(days=i)
        base_sales = 50 + 20 * (d.weekday() // 5) + random.randint(-10, 10) # Weekday/weekend effect
        if d.month in [11, 12]: base_sales *= 1.2 # Holiday season
        if d.month in [6, 7, 8]: base_sales *= 1.1 # Summer
        data.append(SalesDataPoint(timestamp=d, quantity_sold=max(0, int(base_sales)), price=random.uniform(5.0, 15.0)))
    return data

def generate_mock_weather_data(start_date: date, days=30) -> List[WeatherDataPoint]:
    data = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        # Convert date to datetime for WeatherDataPoint if necessary, or adjust WeatherDataPoint
        dt = datetime.combine(d, datetime.min.time())
        data.append(WeatherDataPoint(date=dt, temperature=random.uniform(5, 30), precipitation_prob=random.random()))
    return data

def generate_mock_events(start_date: date, days=30) -> List[EventDataPoint]:
    events = []
    if random.random() < 0.1: # 10% chance of an event in the forecast period
        event_day_offset = random.randint(1, days - 3) if days > 3 else 1
        event_start_dt = datetime.combine(start_date + timedelta(days=event_day_offset), datetime.min.time())
        event_end_dt = event_start_dt + timedelta(days=random.randint(0, 2))
        events.append(EventDataPoint(name="Local Festival", start_date=event_start_dt, end_date=event_end_dt, expected_impact=1.3))
    return events

class DemandForecastingService:
    def __init__(self):
        self.models: Dict[str, Dict[str, Any]] = {} # store_id_product_sku -> trained_model (dummy model info)
        self.historical_sales_cache: Dict[str, pd.DataFrame] = {} # Cache for historical sales

    def _get_or_load_historical_sales(self, store_id: str, product_sku: str) -> pd.DataFrame:
        cache_key = f"{store_id}_{product_sku}"
        if cache_key not in self.historical_sales_cache:
            # Simulate loading/generating historical sales
            sales = generate_mock_sales_data(days=365 * 2) # 2 years of data
            df = pd.DataFrame([vars(s) for s in sales])
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.set_index('timestamp').sort_index()
            self.historical_sales_cache[cache_key] = df
        return self.historical_sales_cache[cache_key]

    def _get_mock_external_data_for_future(self, product_sku: str, store_id: str,
                                           start_date: date, future_days: int,
                                           scenario_adjustments: Optional[Dict] = None) -> Dict:
        if scenario_adjustments is None:
            scenario_adjustments = {}

        weather = generate_mock_weather_data(start_date, days=future_days)
        events = generate_mock_events(start_date, days=future_days)

        # Apply scenario adjustments (simplified)
        event_factor_adj = scenario_adjustments.get("event_impact_multiplier", 1.0)
        if events and event_factor_adj != 1.0:
            events[0].expected_impact *= event_factor_adj

        temp_adjust_c = scenario_adjustments.get("weather_override", {}).get("temperature_increase_celsius", 0)
        if weather and temp_adjust_c != 0:
            for w_point in weather:
                w_point.temperature += temp_adjust_c

        # For hackathon, these are mostly placeholders
        competitor_prices = [CompetitorPricePoint(datetime.now() - timedelta(days=1), "CompetitorX", random.uniform(4.5, 14.0))]
        social_trends = [SocialTrendPoint(datetime.now() - timedelta(days=1), product_sku, random.uniform(-0.5, 0.5))]

        return {
            "future_weather": weather,
            "future_events": events,
            "competitor_prices": competitor_prices, # Using recent past as proxy for current/future
            "social_trends": social_trends # Using recent past as proxy
        }

    def _create_future_features_df(self, historical_sales_df: pd.DataFrame,
                                   start_date: date, future_days: int,
                                   external_data_future: Dict) -> pd.DataFrame:
        future_dates = pd.date_range(start=start_date, periods=future_days, freq='D')
        df_features = pd.DataFrame(index=future_dates)

        df_features['day_of_week'] = df_features.index.dayofweek
        df_features['month'] = df_features.index.month
        df_features['day_of_year'] = df_features.index.dayofyear

        # Lagged sales (e.g., sales from 7 days ago, 14 days ago, 365 days ago)
        # For simplicity, we'll use a generic "base_sales_estimate" from recent history
        if not historical_sales_df.empty:
            # More robust: use actual lagged values if available for these future dates (e.g. from previous year)
            # For demo: use rolling mean of last 30 days as a very rough base.
            df_features['base_sales_estimate'] = historical_sales_df['quantity_sold'].last('30D').mean()
            df_features['base_sales_estimate'] = df_features['base_sales_estimate'].fillna(historical_sales_df['quantity_sold'].mean())
            df_features['base_sales_estimate'] = df_features['base_sales_estimate'].fillna(50) # Fallback
        else:
            df_features['base_sales_estimate'] = 50

        weather_map = {w.date.date(): w for w in external_data_future["future_weather"]}
        df_features['temperature'] = df_features.index.map(lambda d: weather_map.get(d.date(), WeatherDataPoint(datetime.combine(d.date(), datetime.min.time()), 15, 0)).temperature)
        df_features['precipitation_prob'] = df_features.index.map(lambda d: weather_map.get(d.date(), WeatherDataPoint(datetime.combine(d.date(), datetime.min.time()), 15, 0)).precipitation_prob)

        df_features['event_impact_factor'] = 1.0
        for event in external_data_future["future_events"]:
            event_period_dates = pd.date_range(start=event.start_date, end=event.end_date, freq='D')
            for date_idx in df_features.index:
                if date_idx.normalize() in event_period_dates.normalize(): # Compare date part only
                    df_features.loc[date_idx, 'event_impact_factor'] = event.expected_impact

        # Placeholder for competitor/social effects
        df_features['competitor_effect'] = 1.0
        df_features['social_trend_effect'] = 1.0

        return df_features

    def train_model(self, store_id: str, product_sku: str):
        """
        Dummy training: calculates daily averages and overall average from historical data.
        In a real scenario, this would train a proper ML model.
        """
        model_key = f"{store_id}_{product_sku}"
        historical_sales_df = self._get_or_load_historical_sales(store_id, product_sku)

        if historical_sales_df.empty:
            self.models[model_key] = {"type": "fallback_average", "value": random.randint(20, 80)}
            return

        daily_avg = historical_sales_df.groupby(historical_sales_df.index.dayofweek)['quantity_sold'].mean().to_dict()
        monthly_avg = historical_sales_df.groupby(historical_sales_df.index.month)['quantity_sold'].mean().to_dict()
        overall_avg = historical_sales_df['quantity_sold'].mean()

        self.models[model_key] = {
            "type": "heuristic_average",
            "daily_averages": daily_avg,
            "monthly_averages": monthly_avg,
            "overall_average": overall_avg if pd.notna(overall_avg) else 50
        }
        # print(f"Dummy model trained for {model_key}: Averages computed.")

    def predict(self, store_id: str, product_sku: str, future_days: int,
                scenario_adjustments: Optional[Dict] = None) -> ForecastResult:
        model_key = f"{store_id}_{product_sku}"
        if model_key not in self.models:
            self.train_model(store_id, product_sku) # Train dummy model if not exists

        model_info = self.models[model_key]

        start_date_for_forecast = date.today() + timedelta(days=1)

        historical_sales_df = self._get_or_load_historical_sales(store_id, product_sku)
        external_data_future = self._get_mock_external_data_for_future(
            product_sku, store_id, start_date_for_forecast, future_days, scenario_adjustments
        )
        future_features_df = self._create_future_features_df(
            historical_sales_df, start_date_for_forecast, future_days, external_data_future
        )

        forecast_points: List[ForecastOutputPoint] = []
        influencing_factors_summary = [] # For demo purposes

        for idx_date, row in future_features_df.iterrows():
            # Apply heuristic model
            if model_info["type"] == "heuristic_average":
                day_of_week = idx_date.dayofweek
                month = idx_date.month
                base_pred = model_info["daily_averages"].get(day_of_week, model_info["overall_average"])
                # Simple month adjustment
                base_pred = base_pred * (model_info["monthly_averages"].get(month, model_info["overall_average"]) / model_info["overall_average"])
            else: # fallback_average
                base_pred = model_info["value"]

            # Apply feature impacts (multiplicative for simplicity)
            final_prediction = base_pred
            final_prediction *= (1 + (row['temperature'] - 15) * 0.005) # Small temp effect
            final_prediction *= (1 + row['precipitation_prob'] * -0.05) # Small rain effect
            final_prediction *= row['event_impact_factor']
            # final_prediction *= row['competitor_effect'] # Placeholder
            # final_prediction *= row['social_trend_effect'] # Placeholder

            final_prediction = max(0, final_prediction) # Ensure non-negative

            # Simulate confidence interval
            confidence_margin = final_prediction * random.uniform(0.1, 0.25)

            forecast_points.append(
                ForecastOutputPoint(
                    date=idx_date.to_pydatetime(), # Convert Timestamp to datetime
                    predicted_units=round(final_prediction),
                    confidence_low=max(0, round(final_prediction - confidence_margin)),
                    confidence_high=round(final_prediction + confidence_margin)
                )
            )

        # Simplified influencing factors based on scenario adjustments
        if scenario_adjustments:
            if scenario_adjustments.get("event_impact_multiplier", 1.0) != 1.0 and external_data_future["future_events"]:
                event_name = external_data_future["future_events"][0].name
                factor = scenario_adjustments["event_impact_multiplier"]
                influencing_factors_summary.append({
                    "factor": f"Scenario: {event_name}",
                    "impact_description": f"Adjusted by {factor:.2f}x"
                })
            if scenario_adjustments.get("weather_override", {}).get("temperature_increase_celsius", 0) != 0:
                 influencing_factors_summary.append({
                    "factor": "Scenario: Weather Override",
                    "impact_description": f"Temperature adjusted by {scenario_adjustments['weather_override']['temperature_increase_celsius']}°C"
                })


        return ForecastResult(
            product_sku=product_sku,
            store_id=store_id,
            forecast_points=forecast_points,
            influencing_factors_summary=influencing_factors_summary
        )

# Example usage (for testing, not part of Flask app directly here)
if __name__ == '__main__':
    service = DemandForecastingService()

    # Test prediction
    forecast1 = service.predict("Store101", "SKU_FRUIT_APPLES", future_days=7)
    print(f"Forecast for {forecast1.product_sku} at {forecast1.store_id}:")
    for point in forecast1.forecast_points:
        print(f"  {point.date.strftime('%Y-%m-%d')}: Pred={point.predicted_units}, Low={point.confidence_low}, High={point.confidence_high}")
    print(f"Influencing factors: {forecast1.influencing_factors_summary}")

    # Test prediction with scenario
    scenario = {
        "event_impact_multiplier": 1.5, # Simulate a strong positive event
        "weather_override": {"temperature_increase_celsius": 5}
    }
    forecast2 = service.predict("Store101", "SKU_FRUIT_APPLES", future_days=7, scenario_adjustments=scenario)
    print(f"\nForecast with scenario for {forecast2.product_sku} at {forecast2.store_id}:")
    for point in forecast2.forecast_points:
        print(f"  {point.date.strftime('%Y-%m-%d')}: Pred={point.predicted_units}, Low={point.confidence_low}, High={point.confidence_high}")
    print(f"Influencing factors: {forecast2.influencing_factors_summary}")
```

from datetime import datetime, date
from typing import List, Dict, Optional, Any

class MetricValue:
    def __init__(self, value: float, unit: str,
                 trend: Optional[float] = None, # e.g., percentage change from previous period, like 0.05 for +5%
                 target: Optional[float] = None,
                 status_color: Optional[str] = None): # "green", "yellow", "red" based on target
        self.value = value
        self.unit = unit
        self.trend = trend
        self.target = target
        self.status_color = status_color

    def to_dict(self):
        return vars(self)

class ChartDataPoint: # For bar charts, line charts, pie charts
    def __init__(self, label: str, value: float, value2: Optional[float] = None, color: Optional[str] = None):
        self.label = label  # e.g., date, category name
        self.value = value  # Primary value
        self.value2 = value2 # Optional secondary value for comparison (e.g., target vs actual)
        self.color = color # Optional color for this specific data point (e.g., in a pie chart)

    def to_dict(self):
        return vars(self)

class Alert:
    def __init__(self, alert_id: str, title: str, description: str,
                 severity: str, # "Low", "Medium", "High", "Critical"
                 timestamp_iso: str, # ISO format string
                 store_id: Optional[str] = None,
                 metric_impacted: Optional[str] = None, # e.g., "Energy Consumption", "Waste Diversion"
                 suggested_action: Optional[str] = None,
                 is_acknowledged: bool = False):
        self.alert_id = alert_id
        self.title = title
        self.description = description
        self.severity = severity
        self.timestamp_iso = timestamp_iso
        self.store_id = store_id
        self.metric_impacted = metric_impacted
        self.suggested_action = suggested_action
        self.is_acknowledged = is_acknowledged

    def to_dict(self):
        return vars(self)

class GamificationLeaderboardEntry:
    def __init__(self, store_id: str, store_name: str, score: int, rank: int, badges: List[str]):
        self.store_id = store_id
        self.store_name = store_name
        self.score = score
        self.rank = rank
        self.badges = badges # List of badge names or URLs to badge images

    def to_dict(self):
        return vars(self)

class SustainabilityDashboardData:
    """Main data structure for the Sustainability Hub dashboard."""
    def __init__(self, store_id: str, store_name: str, period_label: str,
                 # Key Performance Indicators (KPIs)
                 waste_diversion_rate: MetricValue,
                 energy_consumption_kwh: MetricValue,
                 water_usage_liters: MetricValue,
                 carbon_footprint_co2e: MetricValue,
                 # Chart Data
                 waste_breakdown_chart_data: List[ChartDataPoint], # For Pie/Donut: Recycled, Composted, Donated, Landfill
                 energy_trend_chart_data: List[ChartDataPoint],    # For Line: Energy consumption over time
                 water_trend_chart_data: List[ChartDataPoint],     # For Line: Water usage over time
                 # Other sections
                 active_alerts: List[Alert],
                 gamification_leaderboard: List[GamificationLeaderboardEntry],
                 sustainability_tips: List[str]): # Dynamic tips
        self.store_id = store_id
        self.store_name = store_name
        self.period_label = period_label
        self.waste_diversion_rate = waste_diversion_rate
        self.energy_consumption_kwh = energy_consumption_kwh
        self.water_usage_liters = water_usage_liters
        self.carbon_footprint_co2e = carbon_footprint_co2e
        self.waste_breakdown_chart_data = waste_breakdown_chart_data
        self.energy_trend_chart_data = energy_trend_chart_data
        self.water_trend_chart_data = water_trend_chart_data
        self.active_alerts = active_alerts
        self.gamification_leaderboard = gamification_leaderboard
        self.sustainability_tips = sustainability_tips

    def to_dict(self):
        return {
            "store_id": self.store_id,
            "store_name": self.store_name,
            "period_label": self.period_label,
            "waste_diversion_rate": self.waste_diversion_rate.to_dict(),
            "energy_consumption_kwh": self.energy_consumption_kwh.to_dict(),
            "water_usage_liters": self.water_usage_liters.to_dict(),
            "carbon_footprint_co2e": self.carbon_footprint_co2e.to_dict(),
            "waste_breakdown_chart_data": [dp.to_dict() for dp in self.waste_breakdown_chart_data],
            "energy_trend_chart_data": [dp.to_dict() for dp in self.energy_trend_chart_data],
            "water_trend_chart_data": [dp.to_dict() for dp in self.water_trend_chart_data],
            "active_alerts": [alert.to_dict() for alert in self.active_alerts],
            "gamification_leaderboard": [entry.to_dict() for entry in self.gamification_leaderboard],
            "sustainability_tips": self.sustainability_tips
        }
```

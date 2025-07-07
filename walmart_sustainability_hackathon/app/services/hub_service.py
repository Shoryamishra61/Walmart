from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any
import random

from ..models.hub_models import (
    MetricValue, ChartDataPoint, Alert, GamificationLeaderboardEntry, SustainabilityDashboardData
)

# Mock store names for gamification
MOCK_STORE_NAMES = {
    "Store101": "Fayetteville Supercenter",
    "Store203": "Bentonville NHM",
    "Store505": "Rogers Market",
    "Store789": "Springdale Hub"
}

class SustainabilityHubService:
    def __init__(self):
        # In a real application, this service would connect to various data sources:
        # - Waste management systems (for waste_breakdown)
        # - Energy monitoring systems (IoT sensors, utility bills)
        # - Water usage meters
        # - Carbon footprint calculation engine (could be another service)
        # - Donation platform (for donated waste quantity)
        # - HR/Store management system (for gamification participants)
        # For this hackathon, all data is mocked.
        pass

    def _get_status_color(self, value: float, target: Optional[float], good_is_lower: bool) -> str:
        if target is None:
            return "grey" # No target, no status color

        if good_is_lower: # e.g., energy consumption, landfill waste
            if value <= target * 0.95: return "green"       # Significantly better
            if value <= target * 1.05: return "yellow"      # Close to target
            return "red"                                # Worse than target
        else: # e.g., waste diversion rate, recycling rate
            if value >= target * 1.05: return "green"       # Significantly better
            if value >= target * 0.95: return "yellow"      # Close to target
            return "red"                                # Worse than target

    def generate_mock_dashboard_data(self, store_id: str, period: str = "daily") -> SustainabilityDashboardData:
        """Generates mock data for the sustainability dashboard for a given store and period."""

        store_name = MOCK_STORE_NAMES.get(store_id, store_id) # Fallback to ID if name not found

        # --- Period Label ---
        today = date.today()
        if period == "daily":
            period_label = f"Today ({today.strftime('%b %d, %Y')})"
            num_data_points = 7 # for 7 days trend
            trend_unit_days = 1
        elif period == "weekly":
            start_week = today - timedelta(days=today.weekday())
            end_week = start_week + timedelta(days=6)
            period_label = f"Week: {start_week.strftime('%b %d')} - {end_week.strftime('%b %d, %Y')}"
            num_data_points = 8 # for 8 weeks trend
            trend_unit_days = 7
        else: # monthly
            period_label = f"Month: {today.strftime('%B %Y')}"
            num_data_points = 6 # for 6 months trend
            trend_unit_days = 30


        # --- KPIs ---
        # Waste Diversion Rate
        base_diversion = random.uniform(0.55, 0.80) # 55% to 80%
        diversion_target = 0.75 # 75%
        waste_diversion = MetricValue(
            value=round(base_diversion * 100, 1), unit="%",
            trend=round(random.uniform(-0.05, 0.05), 3), target=diversion_target*100,
            status_color=self._get_status_color(base_diversion, diversion_target, good_is_lower=False)
        )

        # Energy Consumption
        base_energy = random.uniform(10000, 25000) # kWh
        energy_target = base_energy * 0.9 # Target 10% reduction from a baseline
        energy_consumption = MetricValue(
            value=round(base_energy * random.uniform(0.85, 1.15) , 0), unit="kWh",
            trend=round(random.uniform(-0.08, 0.03), 3), target=round(energy_target,0),
            status_color=self._get_status_color(base_energy * random.uniform(0.85, 1.15), energy_target, good_is_lower=True)
        )

        # Water Usage
        base_water = random.uniform(30000, 80000) # Liters
        water_target = base_water * 0.9
        water_usage = MetricValue(
            value=round(base_water * random.uniform(0.85, 1.10), 0), unit="Liters",
            trend=round(random.uniform(-0.10, 0.02), 3), target=round(water_target,0),
            status_color=self._get_status_color(base_water * random.uniform(0.85, 1.10), water_target, good_is_lower=True)
        )

        # Carbon Footprint (very simplified)
        base_carbon = energy_consumption.value * 0.0004 + water_usage.value * 0.000001 + (1-base_diversion)*1000*0.1 # Tonnes CO2e
        carbon_target = base_carbon * 0.85
        carbon_footprint = MetricValue(
            value=round(base_carbon * random.uniform(0.8, 1.1), 2), unit="Tonnes CO₂e",
            trend=round(random.uniform(-0.07, 0.04), 3), target=round(carbon_target,2),
            status_color=self._get_status_color(base_carbon * random.uniform(0.8, 1.1), carbon_target, good_is_lower=True)
        )

        # --- Chart Data ---
        # Waste Breakdown (Pie Chart)
        recycled_kg = random.uniform(200, 800) * (trend_unit_days if period != "daily" else 1)
        composted_kg = random.uniform(100, 500)* (trend_unit_days if period != "daily" else 1)
        donated_kg = random.uniform(50, 200)* (trend_unit_days if period != "daily" else 1)
        landfill_kg = random.uniform(100, 400)* (trend_unit_days if period != "daily" else 1)
        waste_breakdown_data = [
            ChartDataPoint("Recycled", round(recycled_kg,1), color="#4CAF50"), # Green
            ChartDataPoint("Composted", round(composted_kg,1), color="#FFC107"), # Amber
            ChartDataPoint("Donated", round(donated_kg,1), color="#2196F3"),   # Blue
            ChartDataPoint("Landfill", round(landfill_kg,1), color="#F44336")    # Red
        ]

        # Energy Trend (Line Chart)
        energy_trend_data: List[ChartDataPoint] = []
        current_val = energy_consumption.value
        for i in range(num_data_points -1, -1, -1):
            dt = today - timedelta(days=i * trend_unit_days)
            label = dt.strftime('%b %d') if period != "monthly" else dt.strftime('%b %Y')
            current_val *= random.uniform(0.97, 1.03) # slight variation
            energy_trend_data.append(ChartDataPoint(label, round(current_val,0)))

        # Water Trend (Line Chart) - Similar to Energy
        water_trend_data: List[ChartDataPoint] = []
        current_water_val = water_usage.value
        for i in range(num_data_points -1, -1, -1):
            dt = today - timedelta(days=i * trend_unit_days)
            label = dt.strftime('%b %d') if period != "monthly" else dt.strftime('%b %Y')
            current_water_val *= random.uniform(0.96, 1.04)
            water_trend_data.append(ChartDataPoint(label, round(current_water_val,0)))


        # --- Active Alerts ---
        active_alerts: List[Alert] = []
        if random.random() < 0.4: # 40% chance of a high energy alert
            active_alerts.append(Alert(
                alert_id=f"ALERT_ENERGY_{random.randint(100,999)}", title="High Energy Consumption",
                description=f"Energy usage in {store_name} was 15% above target yesterday. Check HVAC Zone 3.",
                severity="High", timestamp_iso=(datetime.now() - timedelta(hours=random.randint(1,12))).isoformat(),
                store_id=store_id, metric_impacted="Energy Consumption",
                suggested_action="Inspect HVAC Zone 3 settings and operation. Verify no doors/windows are open."
            ))
        if random.random() < 0.3: # 30% chance of a waste alert
             active_alerts.append(Alert(
                alert_id=f"ALERT_WASTE_{random.randint(100,999)}", title="Low Waste Diversion Rate",
                description=f"Waste diversion rate for {store_name} dropped by 8% this week. Contamination in recycling bins reported.",
                severity="Medium", timestamp_iso=(datetime.now() - timedelta(days=random.randint(1,3))).isoformat(),
                store_id=store_id, metric_impacted="Waste Diversion",
                suggested_action="Review sorting procedures with staff. Check contamination levels in recycling."
            ))

        # --- Gamification Leaderboard ---
        all_store_ids = list(MOCK_STORE_NAMES.keys())
        leaderboard: List[GamificationLeaderboardEntry] = []
        temp_scores = []
        for s_id in all_store_ids:
            s_name = MOCK_STORE_NAMES.get(s_id, s_id)
            score = random.randint(500, 1500)
            if s_id == store_id: # Ensure current store's score is somewhat realistic based on its metrics
                score = int( (waste_diversion.value * 5) + (1 / (energy_consumption.value/10000) * 100) + (1 / (water_usage.value/30000) * 50) )
                score = max(500, min(1500, score + random.randint(-100,100)))

            badges = []
            if score > 1300: badges.append("Eco-Legend")
            if waste_diversion.value > 70 : badges.append("Recycle Hero")
            if energy_consumption.status_color == "green": badges.append("Energy Saver")
            temp_scores.append({"id": s_id, "name": s_name, "score": score, "badges": badges})

        temp_scores.sort(key=lambda x: x["score"], reverse=True)
        for rank, entry in enumerate(temp_scores):
            leaderboard.append(GamificationLeaderboardEntry(
                store_id=entry["id"], store_name=entry["name"], score=entry["score"], rank=rank + 1, badges=entry["badges"]
            ))


        # --- Sustainability Tips ---
        tips = [
            "Ensure all lights are off in unused areas.",
            "Report any water leaks immediately.",
            "Double-check recycling guidelines to prevent contamination.",
            "Encourage customers to use reusable bags.",
            "Power down equipment at the end of the day."
        ]
        sustainability_tips = random.sample(tips, k=min(len(tips), 3))


        return SustainabilityDashboardData(
            store_id=store_id, store_name=store_name, period_label=period_label,
            waste_diversion_rate=waste_diversion,
            energy_consumption_kwh=energy_consumption,
            water_usage_liters=water_usage,
            carbon_footprint_co2e=carbon_footprint,
            waste_breakdown_chart_data=waste_breakdown_data,
            energy_trend_chart_data=energy_trend_data,
            water_trend_chart_data=water_trend_data,
            active_alerts=active_alerts,
            gamification_leaderboard=leaderboard,
            sustainability_tips=sustainability_tips
        )

# Example Usage
if __name__ == '__main__':
    hub_service = SustainabilityHubService()
    dashboard_data = hub_service.generate_mock_dashboard_data("Store101", "weekly")

    print(f"--- Sustainability Hub for {dashboard_data.store_name} ({dashboard_data.period_label}) ---")
    print(f"Waste Diversion: {dashboard_data.waste_diversion_rate.value}{dashboard_data.waste_diversion_rate.unit} (Target: {dashboard_data.waste_diversion_rate.target}%, Status: {dashboard_data.waste_diversion_rate.status_color})")
    print(f"Energy: {dashboard_data.energy_consumption_kwh.value} {dashboard_data.energy_consumption_kwh.unit}")
    print("\nWaste Breakdown:")
    for dp in dashboard_data.waste_breakdown_chart_data:
        print(f"  {dp.label}: {dp.value} kg")
    print("\nActive Alerts:")
    for alert in dashboard_data.active_alerts:
        print(f"  [{alert.severity}] {alert.title} (Impacts: {alert.metric_impacted}) - {alert.description}")
    print("\nLeaderboard (Top 3):")
    for entry in dashboard_data.gamification_leaderboard[:3]:
        print(f"  #{entry.rank}: {entry.store_name} - {entry.score} pts, Badges: {', '.join(entry.badges)}")
    print("\nTips:")
    for tip in dashboard_data.sustainability_tips:
        print(f"  - {tip}")

```

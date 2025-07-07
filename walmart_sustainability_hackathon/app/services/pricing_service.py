from datetime import date, timedelta
from typing import List, Dict, Optional, Any
import random

from ..models.greenshelf_models import ProductInstanceGS # Product info from GreenShelf
from ..models.pricing_models import ProductPricingInfo, DynamicPriceResult, DynamicPricingRulesConfig, MOCK_PRODUCT_PRICING_PS
from .greenshelf_service import GreenShelfService # Dependency

class DynamicPricingService:
    def __init__(self, greenshelf_service: GreenShelfService,
                 product_pricing_data: Dict[str, ProductPricingInfo] = MOCK_PRODUCT_PRICING_PS):
        self.greenshelf_service = greenshelf_service
        self.product_pricing_data = product_pricing_data
        self.config = DynamicPricingRulesConfig()

    def get_dynamic_price_for_instance(self, instance_id: str, demand_signal_factor: Optional[float] = None) -> Optional[DynamicPriceResult]:
        """
        Calculates dynamic discount for a single product instance.
        demand_signal_factor: Optional multiplier from demand forecasting.
                              >1 means higher demand (potentially smaller discount needed)
                              <1 means lower demand (potentially larger discount needed)
        """
        item_tuple = self.greenshelf_service.get_instance_by_id(instance_id)
        if not item_tuple:
            # print(f"Error (PricingService): Product instance {instance_id} not found in GreenShelf.")
            return None

        product_instance, _ = item_tuple # We don't need shelf_id here for pricing logic itself

        # Ensure product instance's spoilage status is up-to-date
        # (get_instance_by_id doesn't simulate updates, so we might need to if a lot of time passed)
        # For this demo, we assume GreenShelfService.get_shelf_items or a dedicated update call
        # would have recently updated it. If not, call simulate_sensor_update_for_instance here.
        # self.greenshelf_service.simulate_sensor_update_for_instance(product_instance) # Uncomment if direct calls need refresh

        pricing_info = self.product_pricing_data.get(product_instance.sku)
        if not pricing_info:
            # print(f"Error (PricingService): Base pricing info not found for SKU {product_instance.sku}.")
            # Fallback: use product_instance.original_price if it was set, or skip discount
            if hasattr(product_instance, 'original_price') and product_instance.original_price is not None:
                 pricing_info = ProductPricingInfo(sku=product_instance.sku,
                                                   original_price=product_instance.original_price,
                                                   cost_price=product_instance.original_price * 0.5, # Guess cost
                                                   min_margin_pct=0.05)
            else: # Cannot price without original_price
                return DynamicPriceResult( # Return with no discount
                    instance_id=product_instance.instance_id, sku=product_instance.sku, product_name=product_instance.product_name,
                    original_price=0, discount_percentage=0, discounted_price=0,
                    reason="Pricing info unavailable", predicted_spoilage_date=product_instance.predicted_spoilage_date,
                    status_from_greenshelf=product_instance.status, status_color_from_greenshelf=product_instance.status_color
                )


        days_remaining = (product_instance.predicted_spoilage_date - date.today()).days
        base_discount_pct = 0.0
        reason_template = "Standard Price"

        rules_for_status = self.config.TIERS.get(product_instance.status)
        if rules_for_status:
            for threshold_days, discount_pct, rule_name_tmpl in sorted(rules_for_status, key=lambda x: x[0]):
                if days_remaining <= threshold_days:
                    base_discount_pct = discount_pct
                    reason_template = rule_name_tmpl
                    break

        current_demand_factor = demand_signal_factor if demand_signal_factor is not None else self.config.DEFAULT_DEMAND_FACTOR

        effective_discount_pct = base_discount_pct
        # Apply demand factor: If demand is high (factor > 1), we might reduce discount.
        # If demand is low (factor < 1), we might increase discount.
        # This logic is simplified: higher demand factor reduces discount.
        if current_demand_factor != 1.0 and base_discount_pct > 0:
             # Only apply if it makes sense, e.g., not for already critical items where max discount is desired
            if product_instance.status not in ["Critical / Donate", "Spoiled"]:
                 effective_discount_pct = base_discount_pct / current_demand_factor

        # Cap discount by MAX_DISCOUNT_PERCENTAGE
        effective_discount_pct = min(effective_discount_pct, self.config.MAX_DISCOUNT_PERCENTAGE)
        effective_discount_pct = max(0, effective_discount_pct) # Ensure not negative

        # Enforce minimum profit margin
        potential_discounted_price = pricing_info.original_price * (1 - effective_discount_pct)
        min_profitable_price = pricing_info.cost_price * (1 + pricing_info.min_margin_pct)

        final_reason = reason_template.format(product_name=product_instance.product_name)

        if potential_discounted_price < min_profitable_price and pricing_info.original_price > pricing_info.cost_price : # only if profitable at all
            # Adjust discount to meet minimum margin, if possible
            if pricing_info.original_price > min_profitable_price:
                effective_discount_pct = (pricing_info.original_price - min_profitable_price) / pricing_info.original_price
                final_reason += " (Margin Protected)"
            else:
                # If even original price is below cost + min_margin, sell at cost or max possible discount not leading to loss
                effective_discount_pct = (pricing_info.original_price - pricing_info.cost_price) / pricing_info.original_price
                final_reason += " (Near Cost)"

            effective_discount_pct = max(0, min(effective_discount_pct, self.config.MAX_DISCOUNT_PERCENTAGE))


        final_discount_percentage = round(effective_discount_pct, 4) # Store with more precision
        final_discounted_price = round(pricing_info.original_price * (1 - final_discount_percentage), 2)

        # Update ProductInstanceGS with pricing info for the demo UI
        product_instance.original_price = pricing_info.original_price
        product_instance.current_discount_percentage = final_discount_percentage
        product_instance.current_discounted_price = final_discounted_price

        return DynamicPriceResult(
            instance_id=product_instance.instance_id,
            sku=product_instance.sku,
            product_name=product_instance.product_name,
            original_price=pricing_info.original_price,
            discount_percentage=final_discount_percentage,
            discounted_price=final_discounted_price,
            reason=final_reason,
            predicted_spoilage_date=product_instance.predicted_spoilage_date,
            status_from_greenshelf=product_instance.status,
            status_color_from_greenshelf=product_instance.status_color
        )

    def get_dynamic_prices_for_shelf_items(self, shelf_id: str) -> List[DynamicPriceResult]:
        """
        Gets dynamic prices for all items on a given shelf by fetching from GreenShelf first.
        """
        # Get current state of items from GreenShelf (this also simulates sensor updates)
        items_on_shelf = self.greenshelf_service.get_shelf_items(shelf_id, simulate_updates=True)

        priced_results: List[DynamicPriceResult] = []
        for instance in items_on_shelf:
            # For demo, apply a random demand factor or a simple one based on status
            demand_factor = 1.0
            if instance.status == "Nearing Expiry": demand_factor = random.uniform(0.9, 1.1)
            elif instance.status == "Approaching": demand_factor = random.uniform(1.0, 1.2)

            price_result = self.get_dynamic_price_for_instance(instance.instance_id, demand_signal_factor=demand_factor)
            if price_result:
                priced_results.append(price_result)
        return priced_results

# Example for direct testing
if __name__ == '__main__':
    gs_service = GreenShelfService() # Initializes with mock GreenShelf data
    dp_service = DynamicPricingService(greenshelf_service=gs_service)

    print("--- Dynamic Prices for ShelfA1_Dairy (after GreenShelf update & pricing) ---")
    shelf_a1_priced_items = dp_service.get_dynamic_prices_for_shelf_items("ShelfA1_Dairy")
    for item_price_info in shelf_a1_priced_items:
        print(f"  Product: {item_price_info.product_name} ({item_price_info.instance_id})")
        print(f"    Status: {item_price_info.status_from_greenshelf} (Spoilage: {item_price_info.predicted_spoilage_date})")
        print(f"    Original: ${item_price_info.original_price:.2f}, Discounted: ${item_price_info.discounted_price:.2f} ({item_price_info.discount_percentage*100:.0f}% off)")
        print(f"    Reason: {item_price_info.reason}")

    print("\n--- Dynamic Prices for ShelfB1_Meat ---")
    shelf_b1_priced_items = dp_service.get_dynamic_prices_for_shelf_items("ShelfB1_Meat")
    for item_price_info in shelf_b1_priced_items:
        print(f"  Product: {item_price_info.product_name} ({item_price_info.instance_id})")
        print(f"    Status: {item_price_info.status_from_greenshelf} (Spoilage: {item_price_info.predicted_spoilage_date})")
        print(f"    Original: ${item_price_info.original_price:.2f}, Discounted: ${item_price_info.discounted_price:.2f} ({item_price_info.discount_percentage*100:.0f}% off)")
        print(f"    Reason: {item_price_info.reason}")

    # Test a single item if an instance ID is known
    if gs_service.shelf_inventory.get("ShelfA1_Dairy"):
        first_item_instance_id = gs_service.shelf_inventory["ShelfA1_Dairy"][0].instance_id
        print(f"\n--- Single item test for {first_item_instance_id} ---")
        single_item_price = dp_service.get_dynamic_price_for_instance(first_item_instance_id)
        if single_item_price:
            print(f"  Product: {single_item_price.product_name}, Discounted: ${single_item_price.discounted_price:.2f}, Reason: {single_item_price.reason}")

```

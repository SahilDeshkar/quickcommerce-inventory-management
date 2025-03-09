import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_optimized_inventory_data(days=90, num_records=200, out_of_stock_rate=0.1):
    """
    Generate synthetic inventory data with logical patterns.
    
    Args:
        days (int): Number of days to generate data for (backwards from today)
        num_records (int): Number of records to generate
        out_of_stock_rate (float): Probability of an item being out of stock
        
    Returns:
        DataFrame: Pandas DataFrame with synthetic inventory data
    """
    # Sample Data - organized by category for better product-unit mapping
    product_categories = {
        "Grocery": ["Rice", "Pasta", "Flour", "Sugar", "Salt", "Cereal", "Lentils", "Beans"],
        "Dairy": ["Milk", "Eggs", "Yogurt", "Cheese", "Butter"],
        "Fresh Produce": ["Tomatoes", "Onions", "Garlic", "Potatoes", "Apple", "Banana", "Orange", "Spinach", "Carrots"],
        "Protein": ["Chicken", "Tofu", "Fish", "Shrimp"],
        "Beverages": ["Coffee", "Tea", "Olive Oil"],
        "Personal Care": ["Soap", "Shampoo", "Toothpaste", "Shaving Cream", "Deodorant", "Moisturizer", "Face Wash"],
        "Cleaning": ["Toilet Paper", "Laundry Detergent", "Dish Soap", "Hand Sanitizer"]
    }
    
    # Flatten the product list while preserving category information
    names = []
    name_to_category = {}
    for category, products in product_categories.items():
        for product in products:
            names.append(product)
            name_to_category[product] = category
    
    # Map reasonable units to categories for more realistic data
    category_units = {
        "Grocery": ["grams", "kilograms", "packs", "boxes"],
        "Dairy": ["liters", "cartons", "packs"],
        "Fresh Produce": ["grams", "kilograms", "packs", "bunches"],
        "Protein": ["grams", "kilograms", "packs"],
        "Beverages": ["liters", "bottles", "cans"],
        "Personal Care": ["bottles", "tubes", "bars", "packs"],
        "Cleaning": ["bottles", "packs", "boxes", "cans"]
    }
    
    # Map reasonable quantity ranges to categories
    category_quantity_ranges = {
        "Grocery": (5, 25),
        "Dairy": (8, 20),
        "Fresh Produce": (10, 30),
        "Protein": (5, 15),
        "Beverages": (10, 25),
        "Personal Care": (8, 20),
        "Cleaning": (5, 15)
    }
    
    # Map reasonable replenishment times to categories
    category_replenishment_times = {
        "Grocery": (7, 20),
        "Dairy": (3, 10),
        "Fresh Produce": (2, 7),
        "Protein": (3, 10),
        "Beverages": (7, 15),
        "Personal Care": (10, 20),
        "Cleaning": (10, 20)
    }
    
    # Generate logical synthetic data
    start_date = datetime.now() - timedelta(days=days)
    inventory_data = []
    
    for _ in range(num_records):
        # Select random product and get its category
        product_name = random.choice(names)
        category = name_to_category[product_name]
        
        # Choose appropriate unit for this category
        unit = random.choice(category_units[category])
        
        # Determine logical quantity based on category
        min_qty, max_qty = category_quantity_ranges[category]
        quantity = max(1, int(random.gauss((min_qty + max_qty) / 2, (max_qty - min_qty) / 4)))
        
        # Apply out-of-stock probability
        if random.random() < out_of_stock_rate:
            quantity = 0
        
        # Generate order date within the specified timeframe
        order_date = start_date + timedelta(days=random.randint(0, days))
        
        # Determine logical replenishment time based on category
        min_time, max_time = category_replenishment_times[category]
        replenishment_time = random.randint(min_time, max_time)
        
        # Create inventory item
        item = {
            "name": product_name,
            "quantity": quantity,
            "unit": unit,
            "category": category,
            "orderDate": order_date.strftime("%Y-%m-%d"),
            "replenishmentTime": replenishment_time
        }
        inventory_data.append(item)
    
    # Create DataFrame
    df = pd.DataFrame(inventory_data)
    
    # Add seasonal patterns (e.g., increased demand for certain products)
    today_month = datetime.now().month
    for idx, row in df.iterrows():
        product = row["name"]
        order_date = datetime.strptime(row["orderDate"], "%Y-%m-%d")
        
        # Summer items (if current month is in summer)
        summer_items = ["Ice Cream", "Watermelon", "Soda"]
        if order_date.month in [6, 7, 8] and product in summer_items:
            df.at[idx, "quantity"] = max(0, int(df.at[idx, "quantity"] * 0.7))  # Lower stock due to higher demand
            df.at[idx, "replenishmentTime"] = max(2, int(df.at[idx, "replenishmentTime"] * 0.7))  # Faster replenishment
        
        # Winter items (if current month is in winter)
        winter_items = ["Soup", "Hot Chocolate", "Tea"]
        if order_date.month in [12, 1, 2] and product in winter_items:
            df.at[idx, "quantity"] = max(0, int(df.at[idx, "quantity"] * 0.7))  # Lower stock due to higher demand
            df.at[idx, "replenishmentTime"] = max(2, int(df.at[idx, "replenishmentTime"] * 0.7))  # Faster replenishment
    
    return df

# Generate data and save to CSV
inventory_df = generate_optimized_inventory_data(days=90, num_records=200, out_of_stock_rate=0.1)
inventory_df.to_csv("sample_inventory_limited_out_of_stock.csv", index=False)

print(f"CSV file 'sample_inventory_limited_out_of_stock.csv' created successfully with {len(inventory_df)} records!")
print(f"Date range: {inventory_df['orderDate'].min()} to {inventory_df['orderDate'].max()}")
print(f"Out of stock items: {len(inventory_df[inventory_df['quantity'] == 0])}")
print(f"Categories: {inventory_df['category'].value_counts().to_dict()}")
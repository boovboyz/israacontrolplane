import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Paths
DEMO_DATA_DIR = "demo_data"
INTERNAL_DIR = os.path.join(DEMO_DATA_DIR, "internal")
EXTERNAL_DIR = os.path.join(DEMO_DATA_DIR, "external")

def ensure_dirs():
    os.makedirs(INTERNAL_DIR, exist_ok=True)
    os.makedirs(EXTERNAL_DIR, exist_ok=True)
    print(f"Created directories: {INTERNAL_DIR}, {EXTERNAL_DIR}")

def generate_sales_history():
    print("Generating Sales History...")
    regions = ["North", "South", "East", "West", "Northeast"]
    products = ["Sofa", "Dining Table", "Chair", "Bed", "Desk"]
    channels = ["Online", "Retail", "B2B"]
    
    # Dates from 2022-01-01 to 2025-12-31
    dates = pd.date_range(start="2022-01-01", end="2025-12-31", freq="ME")
    
    data = []
    
    for date in dates:
        for region in regions:
            for product in products:
                # Base sales + random variance + trend
                base_sales = np.random.randint(5000, 50000)
                # Trend: Slight growth over years
                year_factor = 1 + (date.year - 2022) * 0.1
                # Seasonality: higher in Q4
                season_factor = 1.2 if date.month >= 10 else 1.0
                
                revenue = int(base_sales * year_factor * season_factor)
                units = int(revenue / np.random.randint(100, 500)) # Approx price
                
                # Split roughly by channel
                for channel in channels:
                    chan_rev = int(revenue * np.random.uniform(0.1, 0.6))
                    data.append({
                        "Date": date,
                        "Region": region,
                        "Product": product,
                        "Channel": channel,
                        "Revenue": chan_rev,
                        "Units": int(chan_rev / 250) # Approx
                    })

    df = pd.DataFrame(data)
    filepath = os.path.join(INTERNAL_DIR, "sales_history.xlsx")
    df.to_excel(filepath, index=False)
    print(f"Saved {filepath}")

def generate_pipeline():
    print("Generating Pipeline...")
    stages = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won"]
    probabilities = {"Prospecting": 0.1, "Qualification": 0.3, "Proposal": 0.6, "Negotiation": 0.8, "Closed Won": 1.0}
    
    data = []
    # Generate 50 active deals for 2026
    start_date = datetime(2026, 1, 1)
    
    for i in range(50):
        stage = np.random.choice(stages)
        amount = np.random.randint(10000, 500000)
        close_date = start_date + timedelta(days=np.random.randint(0, 180))
        
        data.append({
            "Opportunity": f"Opp-{i+1000}",
            "Region": np.random.choice(["North", "South", "East", "West", "Northeast"]),
            "Product_Category": np.random.choice(["Seating", "Dining", "Bedroom", "Office"]),
            "Amount": amount,
            "Stage": stage,
            "Probability": probabilities[stage],
            "Expected_Close_Date": close_date.strftime("%Y-%m-%d")
        })
        
    df = pd.DataFrame(data)
    filepath = os.path.join(INTERNAL_DIR, "pipeline.csv")
    df.to_csv(filepath, index=False)
    print(f"Saved {filepath}")

def generate_product_catalog():
    print("Generating Product Catalog...")
    products = [
        {"SKU": "FUR-001", "Name": "Cloud Sofa", "Category": "Seating", "Price": 1200},
        {"SKU": "FUR-002", "Name": "Ergo Chair", "Category": "Office", "Price": 350},
        {"SKU": "FUR-003", "Name": "Oak Dining Table", "Category": "Dining", "Price": 800},
        {"SKU": "FUR-004", "Name": "King Bed Frame", "Category": "Bedroom", "Price": 950},
        {"SKU": "FUR-005", "Name": "Standing Desk", "Category": "Office", "Price": 600},
    ]
    df = pd.DataFrame(products)
    filepath = os.path.join(INTERNAL_DIR, "product_catalog.csv")
    df.to_csv(filepath, index=False)
    print(f"Saved {filepath}")

def generate_sales_targets():
    print("Generating Sales Targets...")
    regions = ["North", "South", "East", "West", "Northeast"]
    years = [2026, 2027]
    quarters = ["Q1", "Q2", "Q3", "Q4"]
    
    data = []
    for year in years:
        for region in regions:
            for q in quarters:
                target = np.random.randint(2000000, 5000000)
                data.append({
                    "Year": year,
                    "Region": region,
                    "Quarter": q,
                    "Target_Revenue": target
                })
                
    df = pd.DataFrame(data)
    filepath = os.path.join(INTERNAL_DIR, "sales_targets.xlsx")
    df.to_excel(filepath, index=False)
    print(f"Saved {filepath}")

def generate_unstructured_docs():
    print("Generating Unstructured Docs...")
    
    # Internal GTM Plan
    gtm_content = """# Global Furniture GTM Plan 2026

## Strategic Objectives
1. **Expand in the Northeast**: Specifically targeting urban millennials with compact furniture lines.
2. **Launch 'Eco-Office' Line**: Sustainable office furniture is our biggest bet for Q2 2026.
3. **B2B Partnerships**: Secure contracts with 3 major hotel chains by Q3.

## Key Risks
- **Supply Chain**: Timber shortages in Southeast Asia may delay the 'Oak Dining' series.
- **Logistics**: Fuel prices affecting last-mile delivery costs in the West region.

## Marketing Focus
- Shift 40% of budget to Instagram and TikTok ads for the 'Cloud Sofa'.
- Discontinue print catalogs by end of 2026.
"""
    with open(os.path.join(INTERNAL_DIR, "gtm_plan_2026.md"), "w") as f:
        f.write(gtm_content)

    # External Market Trends
    trends_content = """# 2026 Furniture Market Trends Report

## Consumer Behavior
- **Sustainability**: 65% of consumers willing to pay a premium for eco-friendly materials.
- **Work From Home**: Demand for ergonomic home office setups remains 20% above pre-pandemic levels, but growth is slowing.
- **Rental Furniture**: Rising interest in subscription models for urban dwellers.

## Regional Analysis
- **Northeast**: High demand for multi-functional furniture due to smaller apartment sizes.
- **South**: Outdoor furniture sales are booming due to warmer winters.
"""
    with open(os.path.join(EXTERNAL_DIR, "market_trends_furniture.md"), "w") as f:
        f.write(trends_content)
        
    # Competitor Notes
    comp_content = """# Competitor Intelligence Notes

## 'ModernHome' (Primary Competitor)
- Rumored to be launching a 15% discount campaign on all seating in Q1 2026.
- Opening 10 new showrooms in the West, directly challenging our market share there.

## 'BudgetFurn'
- Struggling with quality control issues; their social media sentiment is down 20%.
- We can capitalize on this by emphasizing our 5-year warranty.
"""
    with open(os.path.join(EXTERNAL_DIR, "competitor_notes.md"), "w") as f:
        f.write(comp_content)

    # Macro Signals
    macro_content = """# Macroeconomic Signals 2026-2027

## Housing Market
- New housing starts in the US are projected to slow down by 5% in 2026, which usually correlates with a dip in new furniture purchases.
- However, renovation spending is expected to rise, supporting replacement furniture sales.

## Inflation
- Material costs for wood and steel have stabilized, but shipping rates remain volatile.
"""
    with open(os.path.join(EXTERNAL_DIR, "macro_signals.md"), "w") as f:
        f.write(macro_content)

    print("Saved markdown docs.")

if __name__ == "__main__":
    ensure_dirs()
    generate_sales_history()
    generate_pipeline()
    generate_product_catalog()
    generate_sales_targets()
    generate_unstructured_docs()
    print("\nAll demo data generated successfully!")

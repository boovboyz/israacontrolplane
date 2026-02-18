import os
import pandas as pd
from typing import Dict, List, Tuple

# Paths
DEMO_DATA_DIR = "demo_data"
INTERNAL_DIR = os.path.join(DEMO_DATA_DIR, "internal")
EXTERNAL_DIR = os.path.join(DEMO_DATA_DIR, "external")

def load_structured_data() -> Dict[str, pd.DataFrame]:
    """
    Loads internal structured data into a dictionary of DataFrames.
    """
    data = {}
    
    # Sales History (Excel)
    sales_path = os.path.join(INTERNAL_DIR, "sales_history.xlsx")
    if os.path.exists(sales_path):
        data["sales_history"] = pd.read_excel(sales_path)
        
    # Pipeline (CSV)
    pipeline_path = os.path.join(INTERNAL_DIR, "pipeline.csv")
    if os.path.exists(pipeline_path):
        data["pipeline"] = pd.read_csv(pipeline_path)
        
    # Product Catalog (CSV)
    catalog_path = os.path.join(INTERNAL_DIR, "product_catalog.csv")
    if os.path.exists(catalog_path):
        data["product_catalog"] = pd.read_csv(catalog_path)
        
    # Targets (Excel)
    targets_path = os.path.join(INTERNAL_DIR, "sales_targets.xlsx")
    if os.path.exists(targets_path):
        data["sales_targets"] = pd.read_excel(targets_path)
        
    return data

def load_unstructured_data() -> List[Tuple[str, str]]:
    """
    Loads internal and external markdown files.
    Returns a list of tuples: (filename, content_string).
    """
    docs = []
    
    # Internal docs
    if os.path.exists(INTERNAL_DIR):
        for f in os.listdir(INTERNAL_DIR):
            if f.endswith(".md") or f.endswith(".txt"):
                path = os.path.join(INTERNAL_DIR, f)
                with open(path, "r", encoding="utf-8") as file:
                    docs.append((f, file.read()))
                    
    # External docs
    if os.path.exists(EXTERNAL_DIR):
        for f in os.listdir(EXTERNAL_DIR):
            if f.endswith(".md") or f.endswith(".txt"):
                path = os.path.join(EXTERNAL_DIR, f)
                with open(path, "r", encoding="utf-8") as file:
                    docs.append((f, file.read()))
                    
    return docs

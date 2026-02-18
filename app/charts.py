import re
import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

def parse_forecast_json(text: str):
    """
    Extracts JSON block from LLM response text.
    Returns parsed list of dicts or None if found.
    """
    # Look for ```json ... ```
    pattern = r"```json\s*([\s\S]*?)\s*```"
    match = re.search(pattern, text)
    if match:
        json_str = match.group(1)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            return None
    return None

def render_forecast_chart(data: list):
    """
    Renders an interactive Plotly chart from the forecast data.
    Expected data schema: [{'region': '...', 'period': '...', 'revenue_usd': ...}, ...]
    """
    if not data:
        st.info("No forecast data to visualize.")
        return
    
    df = pd.DataFrame(data)
    
    if "revenue_usd" not in df.columns:
        st.warning("JSON data missing 'revenue_usd' field.")
        return
        
    st.markdown("### Interactive Forecast Model")
    
    # Create interactive plot
    if 'period' in df.columns and 'region' in df.columns:
        fig = px.bar(
            df, 
            x="period", 
            y="revenue_usd", 
            color="region", 
            barmode="group",
            title="Revenue Forecast by Region & Period",
            template="plotly_white",
            labels={"revenue_usd": "Revenue (USD)", "period": "Time Period", "region": "Region"}
        )
    else:
        fig = px.bar(
            df, 
            y="revenue_usd", 
            title="Revenue Forecast",
            template="plotly_white"
        )
    
    st.plotly_chart(fig, use_container_width=True)
    
    with st.expander("View Raw Data Table"):
        st.dataframe(df, use_container_width=True)

import pandas as pd
from typing import Dict, List, Any
from datetime import datetime

def compute_kpi_summary(dfs: Dict[str, pd.DataFrame]) -> str:
    """
    Computes a high-level summary of the structured data to include in the context.
    """
    summary_lines = ["### INTERNAL KPI SUMMARY"]
    
    # 1. Sales History Summary (Latest Full Year)
    if "sales_history" in dfs:
        df_sales = dfs["sales_history"]
        # Convert Date to datetime if not already
        df_sales['Date'] = pd.to_datetime(df_sales['Date'])
        latest_year = df_sales['Date'].dt.year.max()
        
        last_year_sales = df_sales[df_sales['Date'].dt.year == latest_year]
        total_rev = last_year_sales['Revenue'].sum()
        
        summary_lines.append(f"- **Total Revenue ({latest_year})**: ${total_rev:,.0f}")
        
        # Top Region
        top_region = last_year_sales.groupby("Region")['Revenue'].sum().idxmax()
        top_region_rev = last_year_sales.groupby("Region")['Revenue'].sum().max()
        summary_lines.append(f"- **Top Region ({latest_year})**: {top_region} (${top_region_rev:,.0f})")

        # Top Product
        top_prod = last_year_sales.groupby("Product")['Revenue'].sum().idxmax()
        summary_lines.append(f"- **Top Product ({latest_year})**: {top_prod}")

    # 2. Pipeline Summary (2026)
    if "pipeline" in dfs:
        df_pipe = dfs["pipeline"]
        total_open = df_pipe[df_pipe['Stage'] != "Closed Won"]['Amount'].sum()
        weighted_pipe = (df_pipe['Amount'] * df_pipe['Probability']).sum()
        
        summary_lines.append(f"- **Total Open Pipeline (2026)**: ${total_open:,.0f}")
        summary_lines.append(f"- **Weighted Pipeline (2026)**: ${weighted_pipe:,.0f}")

    # 3. Targets
    if "sales_targets" in dfs:
        df_targets = dfs["sales_targets"]
        target_2026 = df_targets[df_targets['Year'] == 2026]['Target_Revenue'].sum()
        if target_2026 > 0:
            summary_lines.append(f"- **Global Sales Target (2026)**: ${target_2026:,.0f}")

    return "\n".join(summary_lines)

def build_prompt_packet(query: str, kpi_summary: str, context_chunks: List[Dict]) -> str:
    """
    Constructs the final prompt packet to send to the LLM.
    """
    
    # Format retrieved context
    context_text = ""
    for idx, c in enumerate(context_chunks):
        context_text += f"\n[Doc {idx+1}: {c['source']}]\n{c['content']}\n"

    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = f"""
You are the "Sales Predictor," an expert AI assistant for Global Furniture's executive team. 
Current Date: {current_date}

TASK:
Answer the user's question about sales forecasts, strategy, or risks. 
Use the provided INTERNAL KPI SUMMARY and RETRIEVED CONTEXT snippets to form your answer.

REQUIREMENTS:
1. Start with an **Executive Summary** (3-6 bullet points).
2. List **Key Assumptions** made in your analysis.
3. List **Risks & Sensitivities**.
4. If the user asks for a numerical forecast (revenue, sales, growth), you MUST end your response with a JSON block inside a ```json code block.
   - The JSON should strictly follow this schema:
     [
       {{"region": "RegionName", "period": "Year or Qx", "revenue_usd": 123456}},
       ...
     ]
   - If no forecast is possible or requested, omit the JSON block.

DATA CONTEXT:
{kpi_summary}

RETRIEVED DOCUMENT SNIPPETS:
{context_text}

USER QUESTION:
{query}
"""
    return prompt.strip()

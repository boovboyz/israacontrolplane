import streamlit as st
import time
import json
from ingest import load_structured_data, load_unstructured_data
from retrieve import get_relevant_context, chunk_documents
from prompt_builder import compute_kpi_summary, build_prompt_packet
from llm import ContentGenerator
from charts import parse_forecast_json, render_forecast_chart
from client import FulcrumClient
import uuid

# Page Config
st.set_page_config(
    page_title="Sales Predictor",
    page_icon="e",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- STYLING ---
st.markdown("""
<style>
    /* Import Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    /* Variables matching Fulcrum Ops (Tailwind config & Index.css) */
    :root {
        --background: #0b0d15; /* 222 15% 5% (approx adjusted for hex) */
        --foreground: #f8fafc; /* 210 40% 98% */
        --card: #11141c;       /* 222 15% 7% */
        --card-foreground: #f8fafc;
        --popover: #11141c;
        --popover-foreground: #f8fafc;
        --primary: #3b82f6;    /* 221 83% 53% */
        --primary-foreground: #f8fafc;
        --secondary: #1f2937;  /* 217 33% 17% */
        --secondary-foreground: #f8fafc;
        --muted: #1e293b;      /* 217 33% 12% */
        --muted-foreground: #94a3b8; /* 215 20% 65% */
        --accent: #1e293b;     /* 217 33% 14% */
        --accent-foreground: #f8fafc;
        --destructive: #7f1d1d; /* 0 62% 30% */
        --border: #1e293b;     /* 217 33% 15% */
        --input: #1e293b;
        --ring: #2563eb;       /* 224 76% 48% */
        --radius: 0.5rem;
    }

    /* Global App Styles */
    .stApp {
        background-color: var(--background);
        color: var(--foreground);
        font-family: 'Inter', sans-serif;
    }

    /* Aggressive Spacing Fixes - Cleaned up */
    .block-container {
        padding-top: 1rem !important;
        padding-bottom: 5rem !important;
        max-width: 90% !important;
    }

    /* Hide the top header decoration bar completely */
    header[data-testid="stHeader"] {
        display: none !important;
    }
    
    /* Adjust sidebar */
    section[data-testid="stSidebar"] {
        background-color: #0b0d10;
        border-right: 1px solid var(--border);
    }
    
    /* Hide Deploy button */
    .stDeployButton {
        display: none;
    }
    
    /* Headings */
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Inter', sans-serif !important;
        color: var(--foreground) !important;
        font-weight: 600 !important;
        letter-spacing: -0.02em;
    }
    
    /* Text */
    p, li, span, div {
        color: var(--foreground);
        font-family: 'Inter', sans-serif;
    }
    
    /* Inputs */
    .stTextInput input, .stSelectbox div[data-baseweb="select"] > div, .stTextArea textarea {
        background-color: var(--input) !important;
        color: var(--foreground) !important;
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
    }
    
    /* Buttons */
    .stButton > button {
        background-color: var(--primary) !important;
        color: var(--primary-foreground) !important;
        border: none !important;
        border-radius: var(--radius) !important;
        font-weight: 500 !important;
        transition: all 0.2s ease;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .stButton > button:hover {
        filter: brightness(110%);
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
        transform: translateY(-1px);
    }
    
    /* Metrics */
    div[data-testid="stMetricValue"] {
        color: var(--primary) !important;
    }
    div[data-testid="stMetricLabel"] {
        color: var(--muted-foreground) !important;
        font-size: 0.8rem !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Cards / Containers (Expander, etc) */
    .streamlit-expanderHeader {
        background-color: var(--card) !important;
        color: var(--foreground) !important;
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
    }
    .streamlit-expanderContent {
        background-color: var(--card) !important;
        border: 1px solid var(--border) !important;
        border-top: none !important;
        color: var(--foreground) !important;
    }

    /* Dividers */
    hr {
        border-color: var(--border) !important;
        opacity: 0.3;
        margin-top: 2rem !important;
        margin-bottom: 2rem !important;
    }
    
    /* Chat Messages */
    .stChatMessage {
        background-color: transparent !important;
        border: 1px solid var(--border) !important;
        border-radius: 0.75rem;
        margin-bottom: 1rem;
    }
    div[data-testid="stChatMessageContent"] {
        background-color: transparent !important;
    }

</style>
""", unsafe_allow_html=True)

# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
if "last_packet" not in st.session_state:
    st.session_state.last_packet = ""
if "last_sources" not in st.session_state:
    st.session_state.last_sources = []
if "forecast_data" not in st.session_state:
    st.session_state.forecast_data = None

# --- SIDEBAR ---
with st.sidebar:
    st.header("Settings")
    
    st.subheader("Model")
    model_name = st.selectbox(
        "AI Engine", 
        [
            "grok-4-fast", 
            "grok-4-latest", 
            "grok-3", 
            "grok-2",
            "meta-llama/Llama-3-70b-chat-hf",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "google/gemma-7b-it"
        ],
        label_visibility="collapsed"
    )
    st.caption(f"Using **{model_name}**")
    
    st.divider()
    
    st.subheader("Retrieval")
    top_k = st.slider("Context Documents", 1, 10, 3)
    
    st.divider()
    
    # Using text_area instead of code block for cleaner look
    with st.expander("Prompt Packet Preview"):
        st.text_area(
            "Last Payload", 
            value=st.session_state.last_packet if st.session_state.last_packet else "No request yet.",
            height=300,
            disabled=True
        )
    
    st.divider()
    
    st.subheader("Ops Platform")
    if "ops_connected" not in st.session_state:
        st.session_state.ops_connected = False
        
    if not st.session_state.ops_connected:
        if st.button("🚀 Connect Ops Platform", type="secondary", use_container_width=True):
            from launcher import connect_ops_platform
            with st.spinner("Initializing Fulcrum Ops..."):
                success = connect_ops_platform()
                if success:
                    st.session_state.ops_connected = True
                    st.success("Connected!")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Startup failed. Check logs.")
    else:
        st.success("🟢 Ops Platform Online")
        st.markdown("[Open Dashboard](http://localhost:5173)")

# --- DATA ---
@st.cache_resource
def load_all_data():
    with st.spinner("Loading Enterprise Info..."):
        struct = load_structured_data()
        docs = load_unstructured_data()
    return struct, docs

structured_data, unstructured_docs = load_all_data()
content_gen = ContentGenerator()

# Helper to parse KPI summary
def parse_kpis_for_display(summary_str):
    summary_lines = summary_str.split('\n')
    metrics = []
    for line in summary_lines:
        if line.startswith("- **Total Revenue"):
            val = line.split("**: ")[1]
            metrics.append(("Revenue", val))
        elif line.startswith("- **Total Open Pipeline"):
            val = line.split("**: ")[1]
            metrics.append(("Open Pipeline", val))
        elif line.startswith("- **Global Sales Target"):
            val = line.split("**: ")[1]
            metrics.append(("2026 Target", val))
    return metrics

kpi_summary = compute_kpi_summary(structured_data)
kpi_metrics = parse_kpis_for_display(kpi_summary)


# --- MAIN LAYOUT ---
st.title("Global Furniture | Sales AI")
st.caption("Executive Forecasting Assistant")

st.divider()

# KPI Row
if kpi_metrics:
    cols = st.columns(len(kpi_metrics) + 1)
    for idx, (label, val) in enumerate(kpi_metrics):
        cols[idx].metric(label, val)
    # Add a fake one for balance
    cols[len(kpi_metrics)].metric("Top Region", "Northeast")

st.divider()

# Tabs
tab_chat, tab_analysis, tab_sources = st.tabs(["Assistant", "Forecast Analysis", "Sources"])

with tab_chat:
    # History
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Input
    if prompt := st.chat_input("Ask a question about sales, risks, or targets..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Processing..."):
                # Pipeline
                relevant_chunks = get_relevant_context(prompt, unstructured_docs, top_k=top_k)
                st.session_state.last_sources = relevant_chunks
                
                packet = build_prompt_packet(prompt, kpi_summary, relevant_chunks)
                st.session_state.last_packet = packet
                
                # Initialize Client
                client = FulcrumClient()
                session_id = st.session_state.get("session_id", str(uuid.uuid4()))
                st.session_state.session_id = session_id
                
                with client.run(
                    user_id="demo_user",
                    session_id=session_id,
                    model=model_name,
                    run_name=f"Query: {prompt[:30]}...",
                    params={"temperature": 0.7, "top_k": top_k}
                ) as run:
                
                    run.log_input(packet, user_question=prompt)
                    
                    full_response, run_id_meta, guardrails_meta = content_gen.generate_response(
                        packet,
                        retrieval_context=relevant_chunks,
                        model=model_name,
                        user_question=prompt,
                        top_k=top_k,
                    )
                    
                    # Use our client run_id instead of internal one?
                    # valid run.run_id should be available here
                    if run.run_id:
                        run_id = run.run_id
                    else:
                        run_id = run_id_meta
                    
                    f_data = parse_forecast_json(full_response)
                    st.session_state.forecast_data = f_data
                    
                    run.log_output(full_response, parsed_json=f_data)
                    
                    # Log retrieval docs as artifact
                    run.log_artifact("retrieved_sources.json", json.dumps(relevant_chunks, indent=2), "json")
                    run.log_artifact("kpi_summary.txt", kpi_summary, "text")

                
                st.markdown(full_response)
                
                # Display Guardrails status
                if guardrails_meta:
                    st.divider()
                    
                    # Status indicators
                    input_status = guardrails_meta.get("input_status", "skipped")
                    output_status = guardrails_meta.get("output_status", "skipped")
                    
                    # Build status string with emojis
                    status_icons = {
                        "passed": "✅",
                        "blocked": "🚫",
                        "warning": "⚠️",
                        "error": "❌",
                        "skipped": "➖"
                    }
                    
                    input_icon = status_icons.get(input_status, "❓")
                    output_icon = status_icons.get(output_status, "❓")
                    
                    # Hover text with  details
                    input_failures = guardrails_meta.get("input_failures", [])
                    output_failures = guardrails_meta.get("output_failures", [])
                    source = guardrails_meta.get("source", "unknown")
                    
                    st.caption(f"**Guardrails**: Input {input_icon} {input_status.upper()} | Output {output_icon} {output_status.upper()} | Source: {source}")
                    
                    # Show failures if any
                    if input_failures:
                        st.warning(f"Input violations: {', '.join(input_failures)}")
                    if output_failures:
                        st.info(f"Output warnings: {', '.join(output_failures)}")
                
                if run_id:
                    st.divider()
                    col1, col2 = st.columns([1, 4])
                    with col1:
                        # Link to Ops Dashboard
                        if st.session_state.get("ops_connected", False):
                             dashboard_url = f"http://localhost:5173/runs/{run_id}"
                             st.link_button("View Ops Data", dashboard_url, type="primary")
                        else:
                            st.caption("Connect Ops to view details")

                    with col2:
                        st.caption(f"Run ID: `{run_id}`")
        
        st.session_state.messages.append({"role": "assistant", "content": full_response})
        st.rerun()

with tab_analysis:
    if st.session_state.forecast_data:
        st.subheader("Quantitative Forecast")
        render_forecast_chart(st.session_state.forecast_data)
    else:
        st.info("No active forecast data. Ask a question to generate predictions.")

with tab_sources:
    st.subheader("Context Used")
    if st.session_state.last_sources:
        for idx, chunk in enumerate(st.session_state.last_sources):
            # Using text display instead of markdown for source name to avoid formatting issues
            st.text(f"Doc {idx+1}: {chunk['source']} (Score: {chunk.get('score', 0)})")
            st.info(chunk['content'])
    else:
        st.caption("Evidence will appear here after a query.")

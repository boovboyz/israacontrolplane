# Sales Predictor Chatbot (Layer 1-3)

A polished demo application for an internal "Sales Predictor Chatbot" that answers natural-language sales forecasting questions using a sophisticated prompt packet approach with LLM observability.

## Architecture

| Layer | Component | Port | Description |
|-------|-----------|------|-------------|
| 1 | Streamlit Chatbot | 8501 | RAG-powered sales forecasting assistant |
| 2 | FastAPI Backend | 8000 | Observability API + MLflow integration |
| 3 | React Dashboard | 80/5173 | Ops dashboard (Replay, Evaluate, Compare) |

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Configure Environment

```bash
# Copy .env.example and add your API keys
cp .env.example .env
# Edit .env with your actual keys:
#   OPENAI_API_KEY=xai-your-key-here
#   TOGETHER_API_KEY=your-together-key (optional)
```

### 2. Build & Run

```bash
docker compose build
docker compose up -d
```

### 3. Access the Application

| Service | URL |
|---------|-----|
| **Sales AI Chatbot** | http://localhost:8501 |
| **Ops Dashboard** | http://localhost |
| **API Docs** | http://localhost:8000/docs |

### 4. Stop

```bash
docker compose down
```

## 🖥️ Local Development

### Quick Start (Unified)

Run the entire stack with a single command:

```bash
python start_all.py
```

This launches all 3 services:
1. **Backend API** (http://localhost:8000)
2. **Frontend Dashboard** (http://localhost:5173)
3. **Sales Predictor Chatbot** (http://localhost:8501)

### Manual Start (Individual Components)

#### Terminal 1: Layer 1 App (Sales Predictor)
```bash
streamlit run app/main.py
```

#### Terminal 2: Layer 2 Backend
```bash
cd fulcrum-llm-ops/backend
uvicorn app.main:app --reload --port 8000
```

#### Terminal 3: Layer 2 Frontend
```bash
cd fulcrum-llm-ops/frontend
npm install
npm run dev
```

## Features

- **Layer 1**: Robust Chatbot with RAG pipeline, logging to MLflow, guardrails-ai validation
- **Layer 2**: Observability Dashboard with cached metrics and artifacts viewer
- **Layer 3**:
    - **Replay Studio**: Edit prompts and re-run against real LLMs
    - **Playground**: Sandbox for prompt testing
    - **Comparisons**: Compare metrics side-by-side
    - **Evaluations**: Human feedback loop (Thumbs Up/Down)

## Configuration

- `.env`: API Keys (`OPENAI_API_KEY` for xAI/Grok, `TOGETHER_API_KEY` for open-source models) and MLflow URI
- `mlruns/`: Directory where all run data is stored locally

## Deploy to Cloud (EC2 / VPS)

1. Spin up an instance (e.g., `t3.medium` on AWS EC2)
2. Install Docker and Docker Compose
3. Clone this repo and `scp` your `.env` file
4. Run `docker compose up -d`
5. Open security group ports: **80**, **8000**, **8501**
6. Access via your instance's **public IP**

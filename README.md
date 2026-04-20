# Autonomous Agent Platform — Datawebify

A Manus-style autonomous AI agent platform. Users submit a natural language goal and the system plans and executes it end-to-end without manual intervention.

The agent breaks goals into steps, selects the right specialist for each step, executes them in sequence, validates every output with a supervisor agent, and returns a structured result with full execution visibility.

## Live Demo

[agent.datawebify.com](https://agent.datawebify.com)

## What It Does

- Accepts any natural language goal
- Generates a step-by-step execution plan automatically
- Routes each step to the correct specialist agent
- Shows live step-by-step progress as execution happens
- Validates every output with a supervisor agent before returning it
- Delivers a structured final output with copy and download options

## Specialist Agents

- **Web Search Agent:** real-time search and source citation via Tavily
- **Code Execution Agent:** sandboxed Python for computation and data analysis
- **Summarization Agent:** executive summaries and structured reports via Claude API
- **File Generation Agent:** PDF, DOCX, CSV output generation
- **Supervisor Agent:** quality validation and confidence scoring on every step

## Stack

- **Orchestration:** LangGraph with TypedDict state management
- **LLM Primary:** GPT-4o (reasoning, planning, tool calling)
- **LLM Fallback:** Claude API (summarization, analysis)
- **Web Search:** Tavily API
- **Vector DB:** pgvector on Supabase
- **Backend:** FastAPI + Python 3.12
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Real-time:** WebSockets for live execution feed
- **Protocol:** MCP (Model Context Protocol) for external tool integration
- **Deployment:** Railway (backend) + Vercel (frontend)

## Architecture
User Goal → Orchestrator (LangGraph)
├── Planner (GPT-4o)
├── Web Search Agent (Tavily)
├── Code Execution Agent (sandboxed Python)
├── Summarization Agent (Claude API)
├── File Generation Agent (WeasyPrint / python-docx)
└── Supervisor Agent (quality validation)
↓
Final Output + Live Step Feed (WebSocket)

## Key Features

- Manus-style live step visibility via WebSockets
- Supervisor confidence scoring on every agent output
- Model abstraction layer: swap GPT-4o and Claude without touching agent code
- MCP integration for external tool expansion
- Session history with replay
- Per-tenant white-label configuration ready

## Getting Started

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your API keys before running.

## Environment Variables
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=

## Deployment

- Backend: Railway (auto-deploy from `backend/` on push to main)
- Frontend: Vercel (auto-deploy from `frontend/` on push to main)
# NovaMind AI — Customer Support Triage MVP

NovaMind AI helps businesses automate workflows, improve customer engagement, and increase productivity through intelligent AI solutions.

This repo now includes an MVP backend for **AI Customer Support Triage**, plus frontend scaffold and dev infrastructure.

## Tech Stack

- **Backend:** FastAPI + LangChain (+ OpenAI optional)
- **Frontend:** Vite + React
- **Dev Environment:** Docker Compose
- **CI/CD:** GitHub Actions placeholder workflow

## Repository Structure

```text
novamind-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── system.py
│   │   │   └── v1.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   ├── services/
│   │   │   ├── knowledge_base.py
│   │   │   ├── tickets.py
│   │   │   └── triage_agent.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
├── .github/workflows/ci.yml
└── docker-compose.yml
```

## Quick Start (Backend)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional env vars for LLM mode:

```bash
export OPENAI_API_KEY=your_key_here
export OPENAI_MODEL=gpt-4o-mini
```

If no API key is provided, the triage agent runs with deterministic heuristics.

## MVP API Endpoints

- `POST /api/v1/ingest/email` — ingest support email payload and run AI triage
- `POST /api/v1/kb/documents` — add knowledge-base document for similarity retrieval
- `GET /api/v1/tickets` — list all tickets
- `GET /api/v1/tickets/{id}` — get ticket detail
- `POST /api/v1/tickets/{id}/claim` — claim a ticket
- `GET /api/v1/analytics/summary` — aggregated metrics
- `GET /health` — service health

## Example Ingestion Payload

```json
{
  "sender_email": "customer@example.com",
  "subject": "Charged twice on my invoice",
  "body": "I was charged twice this month. Please help.",
  "external_message_id": "msg_123"
}
```

## Notes

- MVP storage is in-memory for tickets and KB documents.
- Vector search uses lightweight local term-frequency cosine similarity.
- This is ready for follow-up work (pgvector persistence, Slack routing, SendGrid webhooks).

# Wheel Weaver

Scaffolded monorepo with a FastAPI backend and a Vite + React frontend.

## Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8007
```

Run tests:

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Health check:

```bash
curl http://localhost:8007/api/health
```

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
cd frontend
npm run build
```

The Vite dev server is configured to use port 5177.

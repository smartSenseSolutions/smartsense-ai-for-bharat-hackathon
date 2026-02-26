# Procure AI — AI for Bharat Hackathon

AI-powered procurement management dashboard built with React + FastAPI.

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **PostgreSQL** running locally (default: `localhost:5432`, database `procure_ai`)

---

## Backend

### 1. Install dependencies

```bash
cd backend
uv sync
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. Minimum required for auth to work:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/procure_ai
JWT_SECRET_KEY=your_very_long_random_secret_key_here
```

### 3. Run database migrations

```bash
cd backend
uv run alembic upgrade head
```

### 4. Start the server

```bash
cd backend
uv run uvicorn main:app --reload
```

The API will be available at **http://localhost:8000**.

On first startup the server automatically seeds the superuser account (`ai4bharat@smartsensesolutions.com`).

### Creating a new migration

After changing any SQLAlchemy model:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe your change"
uv run alembic upgrade head
```

### API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Frontend

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment (optional)

By default the frontend calls `http://localhost:8000` for the API. To override:

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
```

### 3. Start the dev server

```bash
cd frontend
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for production

```bash
cd frontend
npm run build
```

---

## Credentials

Will be shared separately to authorized people

---

## Project structure

```
backend/    # FastAPI + SQLAlchemy + PostgreSQL
frontend/   # React 18 + TypeScript + Vite + Tailwind CSS v4
```

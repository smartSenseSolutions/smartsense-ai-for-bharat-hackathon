from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routers import (
    search,
    rfp,
    quotes,
    vendors,
    translation,
    auth,
    documents,
    projects,
    email,
)
from app.core.database import SessionLocal
from app.services.auth import seed_superuser
from app.services.documents import ensure_opensearch_index


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed the superuser account if not present (tables managed by Alembic)
    db = SessionLocal()
    try:
        seed_superuser(db)
    finally:
        db.close()
    # Ensure the OpenSearch vector index exists
    ensure_opensearch_index()
    yield
    # Shutdown actions


app = FastAPI(
    title="Procure AI Backend",
    description="Backend API for Procure AI RFP Handling and Vendor Management",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific frontend origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(search.router)
app.include_router(rfp.router)
app.include_router(quotes.router)
app.include_router(vendors.router)
app.include_router(translation.router)
app.include_router(documents.router)
app.include_router(projects.router)
app.include_router(email.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Procure AI Backend is running"}

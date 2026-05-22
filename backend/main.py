"""
Mentora Backend - FastAPI Application
Main entry point for the Mentora AI chatbot backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load .env file for local development
load_dotenv()

from database.db import init_db
from api.chat import router as chat_router
from api.history import router as history_router
from api.settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Mentora backend starting up...")
    init_db()
    print("✅ Database initialized")
    yield
    print("👋 Mentora backend shutting down...")


app = FastAPI(
    title="Mentora API",
    description="Backend API for the Mentora AI chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow requests from frontend — update this with your Vercel URL after deploying
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.environ.get("FRONTEND_URL", ""),  # set this on Render
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(history_router, prefix="/api", tags=["History"])
app.include_router(settings_router, prefix="/api", tags=["Settings"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "Mentora API is running 🎓"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "mentora-backend", "version": "1.0.0"}

"""
Mentora Settings API Router
Handles user preferences and application settings.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from database.db import get_connection, get_setting, set_setting
from utils.ai import list_available_models

router = APIRouter()


# --- Request Models ---

class UpdateSettingsRequest(BaseModel):
    model: str | None = None
    streaming: bool | None = None
    theme: str | None = None
    default_mode: str | None = None


# --- API Endpoints ---

@router.get("/settings")
async def get_settings():
    """
    Returns all current user settings.
    Also fetches the list of available Ollama models.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()

    # Build settings dict
    settings = {row["key"]: row["value"] for row in rows}

    # Fetch available models from Ollama
    available_models = await list_available_models()

    return {
        "model": settings.get("model", "gemma3:1b"),
        "streaming": settings.get("streaming", "true") == "true",
        "theme": settings.get("theme", "dark"),
        "default_mode": settings.get("default_mode", "casual"),
        "available_models": available_models,
    }


@router.patch("/settings")
async def update_settings(req: UpdateSettingsRequest):
    """
    Updates one or more settings.
    Only updates fields that are actually provided.
    """
    updated = {}

    if req.model is not None:
        set_setting("model", req.model)
        updated["model"] = req.model

    if req.streaming is not None:
        set_setting("streaming", "true" if req.streaming else "false")
        updated["streaming"] = req.streaming

    if req.theme is not None:
        set_setting("theme", req.theme)
        updated["theme"] = req.theme

    if req.default_mode is not None:
        if req.default_mode in ["study", "casual", "quick"]:
            set_setting("default_mode", req.default_mode)
            updated["default_mode"] = req.default_mode

    return {"success": True, "updated": updated}

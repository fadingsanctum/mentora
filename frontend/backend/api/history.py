"""
Mentora History API Router
Handles conversation and message history endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import get_connection

router = APIRouter()


# --- Request Models ---

class RenameRequest(BaseModel):
    title: str


# --- API Endpoints ---

@router.get("/conversations")
async def get_conversations():
    """
    Returns all conversations ordered by most recently updated.
    Used to populate the sidebar chat list.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, mode, created_at, updated_at
        FROM conversations
        ORDER BY updated_at DESC
        """
    )
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "mode": row["mode"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """
    Returns a single conversation with all its messages.
    Used when the user clicks on a chat in the sidebar.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get conversation details
    cursor.execute(
        "SELECT id, title, mode, created_at, updated_at FROM conversations WHERE id = ?",
        (conversation_id,),
    )
    conv = cursor.fetchone()

    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get all messages in this conversation
    cursor.execute(
        """
        SELECT id, role, content, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        """,
        (conversation_id,),
    )
    messages = cursor.fetchall()
    conn.close()

    return {
        "id": conv["id"],
        "title": conv["title"],
        "mode": conv["mode"],
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"],
        "messages": [
            {
                "id": msg["id"],
                "role": msg["role"],
                "content": msg["content"],
                "created_at": msg["created_at"],
            }
            for msg in messages
        ],
    }


@router.patch("/conversations/{conversation_id}/rename")
async def rename_conversation(conversation_id: str, req: RenameRequest):
    """Renames a conversation."""
    title = req.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE conversations SET title = ? WHERE id = ?",
        (title, conversation_id),
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found")
    conn.commit()
    conn.close()

    return {"success": True, "title": title}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """
    Deletes a conversation and all its messages.
    SQLite CASCADE handles the message deletion automatically.
    """
    conn = get_connection()
    cursor = conn.cursor()
    # Enable foreign key support for CASCADE delete
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found")
    conn.commit()
    conn.close()

    return {"success": True}


@router.delete("/history/clear")
async def clear_all_history():
    """
    Deletes ALL conversations and messages.
    Used in the settings page to wipe everything.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("DELETE FROM conversations")
    conn.commit()
    conn.close()

    return {"success": True, "message": "All history cleared"}

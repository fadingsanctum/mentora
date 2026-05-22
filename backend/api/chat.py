"""
Mentora Chat API Router
Handles all chat-related endpoints including streaming responses.
"""

import uuid
import sqlite3
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database.db import get_connection, get_setting
from utils.ai import stream_ollama_response, get_ollama_response, build_messages

router = APIRouter()


# --- Request/Response Models ---

class ChatRequest(BaseModel):
    """What the frontend sends when the user sends a message."""
    conversation_id: str | None = None  # None means start a new conversation
    message: str
    mode: str = "casual"  # study, casual, or quick
    stream: bool = True


class NewConversationRequest(BaseModel):
    """Request to create a new empty conversation."""
    title: str = "New Chat"
    mode: str = "casual"


# --- Helper Functions ---

def get_conversation_history(conversation_id: str, limit: int = 20) -> list[dict]:
    """
    Fetches the last N messages from a conversation to use as context.
    We limit to 20 messages to avoid hitting token limits.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT role, content FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT ?
        """,
        (conversation_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def save_message(conversation_id: str, role: str, content: str) -> str:
    """Saves a message to the database and returns its ID."""
    message_id = str(uuid.uuid4())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
        (message_id, conversation_id, role, content),
    )
    # Update the conversation's updated_at timestamp
    cursor.execute(
        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (conversation_id,),
    )
    conn.commit()
    conn.close()
    return message_id


def create_conversation(title: str = "New Chat", mode: str = "casual") -> str:
    """Creates a new conversation and returns its ID."""
    conv_id = str(uuid.uuid4())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (id, title, mode) VALUES (?, ?, ?)",
        (conv_id, title, mode),
    )
    conn.commit()
    conn.close()
    return conv_id


def auto_title_from_message(message: str) -> str:
    """
    Generates a short title from the first user message.
    Simply takes the first 40 characters and trims cleanly.
    """
    title = message.strip()
    if len(title) > 40:
        title = title[:37] + "..."
    return title or "New Chat"


# --- API Endpoints ---

@router.post("/conversations")
async def create_new_conversation(req: NewConversationRequest):
    """Creates a new conversation and returns its details."""
    conv_id = create_conversation(req.title, req.mode)
    return {
        "id": conv_id,
        "title": req.title,
        "mode": req.mode,
        "created_at": datetime.utcnow().isoformat(),
    }


@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Main chat endpoint.
    - Creates a new conversation if none exists
    - Saves the user's message
    - Gets AI response (streaming or not)
    - Saves the AI response
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Create a new conversation if needed
    conv_id = req.conversation_id
    is_new_conversation = False

    if not conv_id:
        title = auto_title_from_message(req.message)
        conv_id = create_conversation(title, req.mode)
        is_new_conversation = True
    else:
        # Verify the conversation exists
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Conversation not found")
        conn.close()

    # Save the user's message first
    save_message(conv_id, "user", req.message)

    # Get conversation history for context
    history = get_conversation_history(conv_id, limit=20)
    # Remove the last message (we just saved it) to avoid duplication
    history = history[:-1] if history else []

    # Build the message list for Ollama
    ai_messages = build_messages(history, req.message, req.mode)

    # Get the model from settings
    model = get_setting("model", "gemma3:1b")

    # Check streaming preference
    use_stream = req.stream and get_setting("streaming", "true") == "true"

    if use_stream:
        # Streaming response - we collect the full response to save it
        async def stream_and_save():
            full_response = []

            # Yield conversation metadata first as a special event
            if is_new_conversation:
                import json
                meta = json.dumps({"type": "meta", "conversation_id": conv_id})
                yield f"data: {meta}\n\n"

            async for chunk in stream_ollama_response(ai_messages, model):
                full_response.append(chunk)
                # Format as Server-Sent Events
                yield f"data: {chunk}\n\n"

            # Save the complete response to the database
            complete_response = "".join(full_response)
            if complete_response:
                save_message(conv_id, "assistant", complete_response)

            # Signal stream end
            import json
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        return StreamingResponse(
            stream_and_save(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "X-Conversation-Id": conv_id,
            },
        )
    else:
        # Non-streaming: wait for full response
        response_text = await get_ollama_response(ai_messages, model)
        save_message(conv_id, "assistant", response_text)

        return {
            "conversation_id": conv_id,
            "message": response_text,
            "is_new_conversation": is_new_conversation,
        }

"""
Mentora AI Utility
Uses Google Gemini API - free tier, works from anywhere in the world.
Get your free API key at: https://aistudio.google.com/app/apikey
"""

import httpx
import json
import os
from typing import AsyncGenerator
from database.db import get_setting

# Gemini API endpoint
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

def get_api_key() -> str:
    """Get Gemini API key from environment variable."""
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return key

def get_model() -> str:
    """Get the model name - gemini-2.0-flash is free and fast."""
    return "gemini-2.0-flash"

def get_system_prompt(mode: str) -> str:
    prompts = {
        "study": """You are Mentora, an expert AI study assistant. Your role is to:
- Explain complex concepts in simple, clear language
- Break down topics step-by-step
- Create quizzes and flashcards when asked
- Summarize notes and study materials concisely
- Encourage learning with patience and clarity
- Use examples, analogies, and mnemonics to aid understanding
Always be educational, structured, and supportive.""",

        "casual": """You are Mentora, a friendly and intelligent AI companion. Your role is to:
- Have natural, warm conversations
- Be helpful with everyday questions
- Share interesting insights and ideas
- Be concise but thorough in your responses
- Keep a friendly, approachable tone
Be conversational, genuine, and engaging.""",

        "quick": """You are Mentora, a fast and precise AI assistant. Your role is to:
- Give direct, concise answers
- Get straight to the point
- Provide actionable information
- Avoid unnecessary padding or lengthy explanations
- Format responses for quick scanning with bullet points when helpful
Be efficient, accurate, and brief.""",
    }
    return prompts.get(mode, prompts["casual"])


def build_messages(
    conversation_history: list[dict],
    user_message: str,
    mode: str,
) -> list[dict]:
    """Builds message list — kept in OpenAI format, converted before sending."""
    messages = [{"role": "system", "content": get_system_prompt(mode)}]
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def convert_to_gemini_format(messages: list[dict]) -> tuple[str, list[dict]]:
    """
    Converts OpenAI-style messages to Gemini format.
    Gemini uses 'contents' with 'parts', and system prompt is separate.
    """
    system_prompt = ""
    contents = []

    for msg in messages:
        if msg["role"] == "system":
            system_prompt = msg["content"]
        elif msg["role"] == "user":
            contents.append({
                "role": "user",
                "parts": [{"text": msg["content"]}]
            })
        elif msg["role"] == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": msg["content"]}]
            })

    return system_prompt, contents


async def stream_ollama_response(
    messages: list[dict],
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streams response from Gemini API.
    Function name kept as stream_ollama_response so chat.py needs no changes.
    """
    try:
        api_key = get_api_key()
    except ValueError as e:
        yield f"\n\n⚠️ **Configuration Error:** {str(e)}\n\nAdd your GEMINI_API_KEY to the environment."
        return

    system_prompt, contents = convert_to_gemini_format(messages)

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        }
    }

    gemini_model = get_model()
    url = f"{GEMINI_BASE_URL}/{gemini_model}:streamGenerateContent?alt=sse&key={api_key}"

    print(f"[AI] Sending to Gemini: model={gemini_model}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:
                print(f"[AI] Gemini status: {response.status_code}")
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        # Gemini streaming format
                        parts = (
                            data.get("candidates", [{}])[0]
                            .get("content", {})
                            .get("parts", [])
                        )
                        for part in parts:
                            text = part.get("text", "")
                            if text:
                                yield text
                    except json.JSONDecodeError:
                        continue

        except httpx.HTTPStatusError as e:
            error_body = e.response.text
            print(f"[AI] Gemini error {e.response.status_code}: {error_body}")
            if e.response.status_code == 400:
                yield "\n\n⚠️ **Gemini API Error:** Invalid request. Check your API key."
            elif e.response.status_code == 403:
                yield "\n\n⚠️ **Gemini API Error:** API key is invalid or not authorized."
            elif e.response.status_code == 429:
                yield "\n\n⚠️ **Gemini API:** Rate limit hit. Please wait a moment and try again."
            else:
                yield f"\n\n⚠️ **Gemini API Error {e.response.status_code}:** {error_body}"
        except Exception as e:
            print(f"[AI] ERROR: {type(e).__name__}: {e}")
            yield f"\n\n⚠️ **Unexpected error:** {str(e)}"


async def get_ollama_response(
    messages: list[dict],
    model: str | None = None,
) -> str:
    """Non-streaming response from Gemini."""
    try:
        api_key = get_api_key()
    except ValueError as e:
        return f"⚠️ **Configuration Error:** {str(e)}"

    system_prompt, contents = convert_to_gemini_format(messages)

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        }
    }

    gemini_model = get_model()
    url = f"{GEMINI_BASE_URL}/{gemini_model}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "No response received.")
            )
        except Exception as e:
            return f"⚠️ **Error:** {str(e)}"


async def list_available_models() -> list[str]:
    """Returns available Gemini models."""
    return ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

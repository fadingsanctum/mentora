/**
 * Mentora API Client
 * All functions for communicating with the FastAPI backend.
 */

import axios from 'axios'

// In production (Vercel), use the VITE_API_URL env variable
// In development, Vite proxies /api to localhost:8000
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// ─── Conversations ────────────────────────────────────

export async function fetchConversations() {
  const res = await api.get('/conversations')
  return res.data
}

export async function fetchConversation(id) {
  const res = await api.get(`/conversations/${id}`)
  return res.data
}

export async function createConversation(title = 'New Chat', mode = 'casual') {
  const res = await api.post('/conversations', { title, mode })
  return res.data
}

export async function renameConversation(id, title) {
  const res = await api.patch(`/conversations/${id}/rename`, { title })
  return res.data
}

export async function deleteConversation(id) {
  const res = await api.delete(`/conversations/${id}`)
  return res.data
}

export async function clearAllHistory() {
  const res = await api.delete('/history/clear')
  return res.data
}

// ─── Settings ─────────────────────────────────────────

export async function fetchSettings() {
  const res = await api.get('/settings')
  return res.data
}

export async function updateSettings(updates) {
  const res = await api.patch('/settings', updates)
  return res.data
}

// ─── Streaming Chat ────────────────────────────────────

export async function streamChat({
  conversationId,
  message,
  mode,
  onChunk,
  onMeta,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        mode,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'meta') {
            onMeta?.(parsed)
          } else if (parsed.type === 'done') {
            onDone?.()
          }
        } catch {
          if (data) {
            onChunk?.(data)
          }
        }
      }
    }

    onDone?.()
  } catch (err) {
    onError?.(err.message || 'Failed to connect to Mentora backend')
  }
}

export async function sendChat({ conversationId, message, mode }) {
  const res = await api.post('/chat', {
    conversation_id: conversationId,
    message,
    mode,
    stream: false,
  })
  return res.data
}

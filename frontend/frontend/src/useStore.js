/**
 * Mentora Global Store (Zustand)
 * Central state management for conversations, messages, and UI state.
 */

import { create } from 'zustand'

const useStore = create((set, get) => ({
  // ─── Conversations ──────────────────────────────
  conversations: [],          // List of all conversations (sidebar)
  activeConversationId: null, // Currently open conversation
  messages: [],               // Messages in the active conversation
  activeMode: 'casual',       // Current chat mode: study | casual | quick
  activeConversationMode: 'casual', // Mode of the loaded conversation

  // ─── UI State ───────────────────────────────────
  isLoading: false,           // True while waiting for AI response
  isStreaming: false,         // True while streaming response
  sidebarOpen: true,          // Sidebar visibility on mobile
  currentView: 'chat',        // 'chat' | 'settings'
  error: null,                // Error message to display

  // ─── Settings ────────────────────────────────────
  settings: {
    model: 'gemma3:1b',
    streaming: true,
    theme: 'dark',
    default_mode: 'casual',
    available_models: [],
  },

  // ─── Actions: Conversations ──────────────────────

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((state) => ({ conversations: [conv, ...state.conversations] })),

  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      // If we deleted the active one, clear it
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
      messages: state.activeConversationId === id ? [] : state.messages,
    })),

  setActiveConversation: (id, mode = 'casual') =>
    set({ activeConversationId: id, activeConversationMode: mode }),

  clearActiveConversation: () =>
    set({ activeConversationId: null, messages: [], error: null }),

  // ─── Actions: Messages ───────────────────────────

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages]
      // Find the last assistant message and update its content (for streaming)
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content }
          break
        }
      }
      return { messages: msgs }
    }),

  appendToLastAssistantMessage: (chunk) =>
    set((state) => {
      const msgs = [...state.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content: msgs[i].content + chunk }
          break
        }
      }
      return { messages: msgs }
    }),

  // ─── Actions: Mode ───────────────────────────────

  setActiveMode: (mode) => set({ activeMode: mode }),

  // ─── Actions: UI ─────────────────────────────────

  setLoading: (isLoading) => set({ isLoading }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  setError: (error) => set({ error }),

  // ─── Actions: Settings ───────────────────────────

  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) =>
    set((state) => ({ settings: { ...state.settings, [key]: value } })),

  // ─── Derived: Clear everything ───────────────────
  clearAllHistory: () =>
    set({
      conversations: [],
      activeConversationId: null,
      messages: [],
      error: null,
    }),
}))

export default useStore

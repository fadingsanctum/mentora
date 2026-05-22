import { useState, useRef, useEffect, useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Send, BookOpen, Coffee, Zap, StopCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import useStore from '../useStore'
import { streamChat } from '../api'

const MODES = [
  { id: 'study', icon: BookOpen, label: 'Study', color: 'hover:text-emerald-400' },
  { id: 'casual', icon: Coffee, label: 'Casual', color: 'hover:text-accent-light' },
  { id: 'quick', icon: Zap, label: 'Quick', color: 'hover:text-amber-400' },
]

const MODE_ACTIVE = {
  study: 'text-emerald-400 bg-emerald-400/10',
  casual: 'text-accent-light bg-accent/10',
  quick: 'text-amber-400 bg-amber-400/10',
}

export default function ChatInput() {
  const [input, setInput] = useState('')
  const abortRef = useRef(false)

  const {
    activeConversationId,
    activeMode,
    setActiveMode,
    isLoading,
    isStreaming,
    setLoading,
    setStreaming,
    addMessage,
    appendToLastAssistantMessage,
    addConversation,
    setActiveConversation,
    updateConversationTitle,
    setError,
    conversations,
  } = useStore()

  // Pick up starter prompts from WelcomeScreen
  useEffect(() => {
    const starter = sessionStorage.getItem('mentora_starter')
    if (starter) {
      sessionStorage.removeItem('mentora_starter')
      setInput(starter)
    }
  }, [activeConversationId])

  const canSend = input.trim().length > 0 && !isLoading

  const handleSend = useCallback(async () => {
    const message = input.trim()
    if (!message || isLoading) return

    setInput('')
    setError(null)
    setLoading(true)
    abortRef.current = false

    // Optimistically add user message
    addMessage({ id: `u-${Date.now()}`, role: 'user', content: message })
    // Add empty assistant placeholder for streaming
    addMessage({ id: `a-${Date.now()}`, role: 'assistant', content: '' })

    await streamChat({
      conversationId: activeConversationId,
      message,
      mode: activeMode,
      onMeta(meta) {
        // New conversation was created
        if (meta.conversation_id && meta.conversation_id !== activeConversationId) {
          setActiveConversation(meta.conversation_id, activeMode)
          // Add to sidebar if not already there
          const exists = conversations.find(c => c.id === meta.conversation_id)
          if (!exists) {
            addConversation({
              id: meta.conversation_id,
              title: message.length > 40 ? message.slice(0, 37) + '...' : message,
              mode: activeMode,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        }
      },
      onChunk(chunk) {
        if (abortRef.current) return
        setStreaming(true)
        appendToLastAssistantMessage(chunk)
      },
      onDone() {
        setLoading(false)
        setStreaming(false)
      },
      onError(err) {
        setError(err)
        setLoading(false)
        setStreaming(false)
        appendToLastAssistantMessage(`\n\n⚠️ ${err}`)
      },
    })
  }, [input, isLoading, activeConversationId, activeMode])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleStop() {
    abortRef.current = true
    setLoading(false)
    setStreaming(false)
  }

  return (
    <div className="shrink-0 px-4 sm:px-6 pb-5 pt-2">
      {/* Mode pills */}
      <div className="flex items-center gap-1 mb-2.5 px-1">
        {MODES.map(({ id, icon: Icon, label, color }) => (
          <button
            key={id}
            onClick={() => setActiveMode(id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
              activeMode === id
                ? `${MODE_ACTIVE[id]} border-current/30`
                : `text-white/30 border-transparent ${color} hover:border-white/10`
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Input box */}
      <motion.div
        layout
        className="relative flex items-end gap-3 px-4 py-3 rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm
          focus-within:border-accent/30 focus-within:bg-white/5 transition-all duration-200"
      >
        <TextareaAutosize
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeMode === 'study'
              ? 'Ask me to explain something, quiz you, or summarize...'
              : activeMode === 'quick'
              ? 'Ask a quick question...'
              : 'Say something...'
          }
          minRows={1}
          maxRows={6}
          className="chat-input flex-1"
          disabled={isLoading && !isStreaming}
        />

        {isStreaming ? (
          <button
            onClick={handleStop}
            className="shrink-0 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all"
          >
            <StopCircle size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`shrink-0 p-2 rounded-xl transition-all duration-200 ${
              canSend
                ? 'bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/20'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            <Send size={15} />
          </button>
        )}
      </motion.div>

      <p className="text-white/18 text-[11px] text-center mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}

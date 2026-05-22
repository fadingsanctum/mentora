import { useEffect, useRef } from 'react'
import { Menu, BookOpen, Coffee, Zap } from 'lucide-react'
import useStore from '../useStore'
import { fetchConversation } from '../api'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

const MODE_CONFIG = {
  study: { icon: BookOpen, label: 'Study Helper', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  casual: { icon: Coffee, label: 'Casual Chat', color: 'text-accent-light', bg: 'bg-accent/10', border: 'border-accent/20' },
  quick: { icon: Zap, label: 'Quick Help', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
}

export default function ChatView() {
  const {
    activeConversationId,
    activeConversationMode,
    messages,
    setMessages,
    isLoading,
    setSidebarOpen,
  } = useStore()

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) return
    fetchConversation(activeConversationId)
      .then(data => setMessages(data.messages || []))
      .catch(console.error)
  }, [activeConversationId])

  const mode = MODE_CONFIG[activeConversationMode] || MODE_CONFIG.casual
  const ModeIcon = mode.icon

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-surface-950/80 backdrop-blur-md shrink-0">
        <button
          className="lg:hidden btn-ghost p-1.5 -ml-1"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${mode.bg} ${mode.border}`}>
          <ModeIcon size={12} className={mode.color} />
          <span className={`text-xs font-medium ${mode.color}`}>{mode.label}</span>
        </div>

        <div className="flex-1" />

        <span className="text-white/20 text-xs hidden sm:block">
          {messages.length > 0 ? `${Math.ceil(messages.length / 2)} exchanges` : 'New chat'}
        </span>
      </header>

      {/* Messages */}
      <MessageList />

      {/* Input */}
      <ChatInput />
    </div>
  )
}

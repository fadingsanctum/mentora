import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, MessageSquare, Trash2, Pencil, Check, X,
  Settings, ChevronLeft, BookOpen, Zap, Coffee,
} from 'lucide-react'
import useStore from '../useStore'
import {
  fetchConversation,
  createConversation,
  deleteConversation,
  renameConversation,
  clearAllHistory,
} from '../api'

const MODE_ICONS = {
  study: BookOpen,
  casual: Coffee,
  quick: Zap,
}

const MODE_COLORS = {
  study: 'text-emerald-400',
  casual: 'text-accent-light',
  quick: 'text-amber-400',
}

export default function Sidebar() {
  const {
    conversations,
    activeConversationId,
    sidebarOpen,
    setSidebarOpen,
    setCurrentView,
    currentView,
    setMessages,
    setActiveConversation,
    clearActiveConversation,
    addConversation,
    removeConversation,
    updateConversationTitle,
    setConversations,
    activeMode,
    setLoading,
  } = useStore()

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  async function handleNewChat() {
    const conv = await createConversation('New Chat', activeMode)
    addConversation(conv)
    const data = await fetchConversation(conv.id)
    setMessages(data.messages || [])
    setActiveConversation(conv.id, conv.mode)
    setCurrentView('chat')
    setSidebarOpen(false)
  }

  async function handleSelectConversation(conv) {
    if (conv.id === activeConversationId) return
    setLoading(true)
    try {
      const data = await fetchConversation(conv.id)
      setMessages(data.messages || [])
      setActiveConversation(conv.id, conv.mode)
      setCurrentView('chat')
      setSidebarOpen(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    await deleteConversation(id)
    removeConversation(id)
    if (activeConversationId === id) clearActiveConversation()
  }

  function startEdit(e, conv) {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  async function submitRename(id) {
    if (!editTitle.trim()) return cancelEdit()
    await renameConversation(id, editTitle.trim())
    updateConversationTitle(id, editTitle.trim())
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
  }

  async function handleClearAll() {
    if (!confirmClear) { setConfirmClear(true); return }
    await clearAllHistory()
    setConversations([])
    clearActiveConversation()
    setConfirmClear(false)
  }

  return (
    <motion.aside
      className={`
        sidebar-glass fixed lg:relative z-30 h-full flex flex-col
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{ width: 260, minWidth: 260 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-sm font-bold font-display">M</span>
          </div>
          <span className="font-display font-semibold text-white text-[15px] tracking-tight">
            Mentora
          </span>
        </div>
        <button
          className="lg:hidden btn-ghost p-1.5"
          onClick={() => setSidebarOpen(false)}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
            bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent/40
            text-accent-light text-sm font-medium transition-all duration-200 group"
        >
          <Plus size={15} className="group-hover:rotate-90 transition-transform duration-200" />
          New conversation
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-white/25 text-xs text-center py-8 px-4">
            No conversations yet. Start a new chat above.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {conversations.map((conv) => {
              const ModeIcon = MODE_ICONS[conv.mode] || MessageSquare
              const isActive = conv.id === activeConversationId
              const isEditing = editingId === conv.id

              return (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    onClick={() => !isEditing && handleSelectConversation(conv)}
                    className={`
                      group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                      transition-all duration-150 select-none
                      ${isActive
                        ? 'bg-white/8 text-white'
                        : 'text-white/55 hover:text-white/80 hover:bg-white/4'
                      }
                    `}
                  >
                    <ModeIcon
                      size={13}
                      className={`shrink-0 ${isActive ? MODE_COLORS[conv.mode] || 'text-accent-light' : 'text-white/30'}`}
                    />

                    {isEditing ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(conv.id)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-white text-xs outline-none border-b border-accent/60 pb-0.5 min-w-0"
                      />
                    ) : (
                      <span className="flex-1 text-xs truncate min-w-0 leading-relaxed">
                        {conv.title}
                      </span>
                    )}

                    {/* Action buttons */}
                    <div
                      className={`flex items-center gap-0.5 shrink-0 transition-opacity duration-150 ${
                        isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => submitRename(conv.id)}
                            className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            <Check size={11} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded-md hover:bg-white/10 text-white/40 transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => startEdit(e, conv)}
                            className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="p-1 rounded-md hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5 space-y-1 mt-auto">
        {conversations.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
              confirmClear
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'text-white/35 hover:text-white/60 hover:bg-white/4'
            }`}
            onBlur={() => setConfirmClear(false)}
          >
            <Trash2 size={12} />
            {confirmClear ? 'Click again to confirm' : 'Clear all history'}
          </button>
        )}
        <button
          onClick={() => setCurrentView(currentView === 'settings' ? 'chat' : 'settings')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
            currentView === 'settings'
              ? 'bg-white/8 text-white'
              : 'text-white/35 hover:text-white/60 hover:bg-white/4'
          }`}
        >
          <Settings size={12} />
          Settings
        </button>
      </div>
    </motion.aside>
  )
}

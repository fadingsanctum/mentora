import { motion } from 'framer-motion'
import { BookOpen, Coffee, Zap, ArrowRight, Sparkles } from 'lucide-react'
import useStore from '../useStore'
import { createConversation, fetchConversation } from '../api'

const MODES = [
  {
    id: 'study',
    icon: BookOpen,
    label: 'Study Helper',
    color: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconColor: 'text-emerald-400',
    description: 'Explain concepts, create quizzes, summarize notes',
    prompts: ['Explain photosynthesis simply', 'Quiz me on World War II', 'Summarize: [paste your notes]'],
  },
  {
    id: 'casual',
    icon: Coffee,
    label: 'Casual Chat',
    color: 'from-accent/20 to-accent/5',
    border: 'border-accent/20 hover:border-accent/40',
    iconColor: 'text-accent-light',
    description: 'Friendly conversation and everyday help',
    prompts: ['What are some interesting facts?', 'Help me brainstorm ideas', 'Tell me something surprising'],
  },
  {
    id: 'quick',
    icon: Zap,
    label: 'Quick Help',
    color: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    iconColor: 'text-amber-400',
    description: 'Fast, direct answers without the fluff',
    prompts: ['Best Python libraries for data?', 'Fix my code: [paste error]', 'Translate to Spanish: Hello'],
  },
]

export default function WelcomeScreen() {
  const {
    activeMode, setActiveMode,
    addConversation, setMessages,
    setActiveConversation, setCurrentView, setSidebarOpen,
  } = useStore()

  async function startChat(mode, prompt = null) {
    setActiveMode(mode)
    const conv = await createConversation('New Chat', mode)
    addConversation(conv)
    const data = await fetchConversation(conv.id)
    setMessages(data.messages || [])
    setActiveConversation(conv.id, conv.mode)
    setCurrentView('chat')
    // If a prompt was selected, it'll be sent via ChatInput's initial message
    if (prompt) {
      // Store starter prompt in sessionStorage for ChatInput to pick up
      sessionStorage.setItem('mentora_starter', prompt)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full px-6 pb-16 overflow-y-auto">
      {/* Logo area */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 mb-4">
          <Sparkles size={24} className="text-accent-light" />
        </div>
        <h1 className="font-display font-bold text-3xl text-white tracking-tight mb-2">
          Welcome to Mentora
        </h1>
        <p className="text-white/45 text-sm max-w-sm mx-auto leading-relaxed">
          Your intelligent AI companion for studying, learning, and everyday help.
        </p>
      </motion.div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
        {MODES.map((mode, i) => {
          const Icon = mode.icon
          const isActive = activeMode === mode.id
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 + 0.15, duration: 0.35 }}
            >
              <button
                onClick={() => startChat(mode.id)}
                className={`
                  w-full text-left p-4 rounded-2xl border bg-gradient-to-b transition-all duration-200
                  ${mode.color} ${mode.border}
                  ${isActive ? 'ring-1 ring-white/15' : ''}
                  hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20
                `}
              >
                <Icon size={18} className={`${mode.iconColor} mb-3`} />
                <p className="font-display font-semibold text-white text-sm mb-1">{mode.label}</p>
                <p className="text-white/45 text-xs leading-relaxed">{mode.description}</p>
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Starter prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="w-full max-w-2xl"
      >
        <p className="text-white/25 text-xs text-center mb-3 uppercase tracking-wider">Try a starter</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {MODES.find(m => m.id === activeMode)?.prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => startChat(activeMode, prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                border border-white/8 bg-white/3 hover:bg-white/8 hover:border-white/15
                text-white/50 hover:text-white/80 transition-all duration-150"
            >
              {prompt}
              <ArrowRight size={10} className="opacity-50" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

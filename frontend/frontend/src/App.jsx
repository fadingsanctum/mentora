import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useStore from './useStore'
import { fetchConversations, fetchSettings } from './api'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import SettingsView from './components/SettingsView'
import WelcomeScreen from './components/WelcomeScreen'

export default function App() {
  const {
    currentView,
    activeConversationId,
    sidebarOpen,
    setConversations,
    setSettings,
    setSidebarOpen,
  } = useStore()

  // Load conversations and settings on mount
  useEffect(() => {
    fetchConversations().then(setConversations).catch(console.error)
    fetchSettings().then(setSettings).catch(console.error)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <AnimatePresence mode="wait">
          {currentView === 'settings' ? (
            <motion.div
              key="settings"
              className="flex-1 overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsView />
            </motion.div>
          ) : activeConversationId ? (
            <motion.div
              key={`chat-${activeConversationId}`}
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <ChatView />
            </motion.div>
          ) : (
            <motion.div
              key="welcome"
              className="flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <WelcomeScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

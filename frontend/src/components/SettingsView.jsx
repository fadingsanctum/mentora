import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Cpu, Zap, Palette, Trash2, ChevronRight, CheckCircle } from 'lucide-react'
import useStore from '../useStore'
import { updateSettings } from '../api'

function SettingRow({ icon: Icon, label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={14} className="text-white/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          {description && <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
        checked ? 'bg-accent' : 'bg-white/15'
      }`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsView() {
  const { settings, setSettings, clearAllHistory, conversations, setConversations } = useStore()
  const [saved, setSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  async function handleUpdate(key, value) {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    await updateSettings({ [key]: value })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleClearHistory() {
    if (!confirmClear) { setConfirmClear(true); return }
    const { clearAllHistory: apiClear } = await import('../api')
    await apiClear()
    clearAllHistory()
    setConversations([])
    setConfirmClear(false)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <Settings size={18} className="text-accent-light" />
            <h1 className="font-display font-semibold text-white text-xl">Settings</h1>
            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-emerald-400 text-xs"
              >
                <CheckCircle size={12} />
                Saved
              </motion.div>
            )}
          </div>
          <p className="text-white/35 text-sm">Configure your Mentora experience</p>
        </motion.div>

        {/* AI Model */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/3 border border-white/6 rounded-2xl px-5 mb-4"
        >
          <SettingRow
            icon={Cpu}
            label="AI Model"
            description="Local Ollama model used for generating responses"
          >
            <select
              value={settings.model}
              onChange={(e) => handleUpdate('model', e.target.value)}
              className="bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80
                outline-none focus:border-accent/40 transition-colors cursor-pointer"
            >
              {(settings.available_models?.length > 0
                ? settings.available_models
                : [settings.model]
              ).map(m => (
                <option key={m} value={m} className="bg-surface-900">{m}</option>
              ))}
            </select>
          </SettingRow>

          <SettingRow
            icon={Zap}
            label="Streaming Responses"
            description="Show AI responses word-by-word as they're generated"
          >
            <Toggle
              checked={settings.streaming}
              onChange={(v) => handleUpdate('streaming', v)}
            />
          </SettingRow>
        </motion.div>

        {/* Default Mode */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/3 border border-white/6 rounded-2xl px-5 mb-4"
        >
          <SettingRow
            icon={Palette}
            label="Default Chat Mode"
            description="Mode applied when starting a new conversation"
          >
            <select
              value={settings.default_mode}
              onChange={(e) => handleUpdate('default_mode', e.target.value)}
              className="bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80
                outline-none focus:border-accent/40 transition-colors cursor-pointer"
            >
              <option value="casual" className="bg-surface-900">Casual Chat</option>
              <option value="study" className="bg-surface-900">Study Helper</option>
              <option value="quick" className="bg-surface-900">Quick Help</option>
            </select>
          </SettingRow>
        </motion.div>

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-red-500/5 border border-red-500/15 rounded-2xl px-5"
        >
          <SettingRow
            icon={Trash2}
            label="Clear All History"
            description={`Delete all ${conversations.length} conversation${conversations.length !== 1 ? 's' : ''} and messages permanently`}
          >
            <button
              onClick={handleClearHistory}
              onBlur={() => setConfirmClear(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                confirmClear
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
              }`}
            >
              {confirmClear ? 'Confirm?' : 'Clear all'}
            </button>
          </SettingRow>
        </motion.div>

        {/* Info */}
        <p className="text-white/18 text-xs text-center mt-8">
          Mentora v1.0 · Powered by Ollama · All data stored locally
        </p>
      </div>
    </div>
  )
}

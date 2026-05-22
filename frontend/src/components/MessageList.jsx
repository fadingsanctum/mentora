import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import useStore from '../useStore'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

function CodeBlock({ language, value }) {
  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-white/8">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/8">
        <span className="text-white/30 text-xs font-mono">{language || 'code'}</span>
        <CopyButton text={value} />
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.4)',
          fontSize: '13px',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

function Message({ msg, isStreaming }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 sm:px-6`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5 mr-2.5">
          <span className="text-accent-light text-xs font-bold font-display">M</span>
        </div>
      )}

      <div
        className={`max-w-[82%] sm:max-w-[72%] ${
          isUser
            ? 'bg-accent/15 border border-accent/25 text-white rounded-2xl rounded-tr-sm px-4 py-3'
            : 'text-white/90'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className={`prose-mentora ${isStreaming ? 'streaming-cursor' : ''}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  )
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 px-4 sm:px-6">
      <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
        <span className="text-accent-light text-xs font-bold font-display">M</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-white/4 rounded-2xl rounded-tl-sm border border-white/6">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

export default function MessageList() {
  const { messages, isLoading, isStreaming } = useStore()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto py-6 space-y-5">
      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => {
          const isLastAssistant =
            idx === messages.length - 1 && msg.role === 'assistant'
          return (
            <Message
              key={msg.id || idx}
              msg={msg}
              isStreaming={isStreaming && isLastAssistant}
            />
          )
        })}
      </AnimatePresence>

      {isLoading && !isStreaming && <TypingIndicator />}

      <div ref={bottomRef} className="h-1" />
    </div>
  )
}
